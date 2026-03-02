#!/usr/bin/env node
/**
 * process-notes.mjs
 *
 * Downloads new voice notes and documents from Google Drive, transcribes audio
 * with Whisper, and prints everything ready for review.
 *
 * Usage:
 *   node scripts/process-notes.mjs
 *
 * First run: opens browser for Google OAuth consent, stores token locally.
 * Subsequent runs: uses stored token automatically.
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync, exec } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────
const FOLDER_ID = '1vqX6q1KiELarvCbNdTOlPyPlUYbOKblz';
const CREDENTIALS_FILE = path.join(ROOT, 'scripts', 'google-credentials.json');
const TOKEN_FILE = path.join(ROOT, 'scripts', '.google-token.json');
const PROCESSED_FILE = path.join(ROOT, 'scripts', '.processed-files.json');
const DOWNLOAD_DIR = path.join(ROOT, 'scripts', '.downloads');
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Audio/video mime types to transcribe with Whisper
const AUDIO_MIMES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
  'audio/wav', 'audio/ogg', 'audio/webm', 'video/mp4',
  'application/octet-stream', // .m4a sometimes comes as this
]);

// Audio file extensions (fallback check)
const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.webm', '.mp4', '.aac']);

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadProcessed() {
  try { return JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8')); }
  catch { return {}; }
}

function saveProcessed(data) {
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null, 2));
}

const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

function openBrowser(url) {
  exec(`open "${url}"`); // macOS
}

function waitForAuthCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const code = new URL(req.url, REDIRECT_URI).searchParams.get('code');
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2 style="font-family:sans-serif;text-align:center;margin-top:80px">✅ Authorized! You can close this tab.</h2>');
        server.close();
        resolve(code);
      } else {
        res.writeHead(400);
        res.end('No code received');
        server.close();
        reject(new Error('No auth code in callback'));
      }
    });
    server.listen(REDIRECT_PORT, () => {
      console.log(`  Listening for OAuth callback on port ${REDIRECT_PORT}...`);
    });
    server.on('error', reject);
    // Timeout after 2 minutes
    setTimeout(() => { server.close(); reject(new Error('Auth timed out')); }, 120000);
  });
}

async function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error(`\n❌  Missing credentials file: scripts/google-credentials.json\n`);
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
  const { client_id, client_secret } = creds.installed || creds.web;

  const oauth2 = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

  // Use stored token if available
  if (fs.existsSync(TOKEN_FILE)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    oauth2.setCredentials(token);
    oauth2.on('tokens', (newTokens) => {
      const existing = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      fs.writeFileSync(TOKEN_FILE, JSON.stringify({ ...existing, ...newTokens }, null, 2));
    });
    return oauth2;
  }

  // First run: open browser, local server catches the redirect
  const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\n🔐  Opening browser for Google authorization (sign in as steven@simpleav.co)...\n');
  openBrowser(authUrl);

  const code = await waitForAuthCode();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log('\n✅  Authorized and token saved. Future runs will be automatic.\n');

  return oauth2;
}

async function listFolderFiles(drive, folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
  });
  return res.data.files || [];
}

async function downloadFile(drive, fileId, destPath) {
  const dest = fs.createWriteStream(destPath);
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return new Promise((resolve, reject) => {
    res.data.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
  });
}

async function exportGoogleDoc(drive, fileId, destPath) {
  const res = await drive.files.export(
    { fileId, mimeType: 'text/plain' },
    { responseType: 'stream' }
  );
  const dest = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    res.data.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
  });
}

function transcribeAudio(filePath) {
  console.log(`  🎙  Transcribing ${path.basename(filePath)}...`);
  try {
    const result = execSync(
      `whisper "${filePath}" --model base --output_format txt --output_dir "${DOWNLOAD_DIR}" 2>/dev/null`,
      { encoding: 'utf8', timeout: 120000 }
    );
    const txtPath = filePath.replace(/\.[^.]+$/, '.txt');
    if (fs.existsSync(txtPath)) {
      return fs.readFileSync(txtPath, 'utf8').trim();
    }
    return result.trim();
  } catch (err) {
    return `[Transcription failed: ${err.message}]`;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🗂  Checking Google Drive notes folder...\n');

  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const files = await listFolderFiles(drive, FOLDER_ID);

  if (files.length === 0) {
    console.log('📭  No files found in the folder.');
    return;
  }

  const processed = loadProcessed();
  const newFiles = files.filter((f) => !processed[f.id]);

  if (newFiles.length === 0) {
    console.log(`✅  All ${files.length} file(s) already processed. No new notes.\n`);
    console.log('   To reprocess a file, delete its entry from scripts/.processed-files.json');
    return;
  }

  console.log(`📥  Found ${newFiles.length} new file(s) to process:\n`);

  const results = [];

  for (const file of newFiles) {
    const ext = path.extname(file.name).toLowerCase();
    const isAudio = AUDIO_MIMES.has(file.mimeType) || AUDIO_EXTS.has(ext);
    const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
    const isText = file.mimeType === 'text/plain' || ext === '.txt';

    console.log(`  📄  ${file.name}  (${file.mimeType})`);

    try {
      let content = '';

      if (isAudio) {
        const destPath = path.join(DOWNLOAD_DIR, file.name);
        await downloadFile(drive, file.id, destPath);
        content = transcribeAudio(destPath);

      } else if (isGoogleDoc) {
        const destPath = path.join(DOWNLOAD_DIR, file.name + '.txt');
        await exportGoogleDoc(drive, file.id, destPath);
        content = fs.readFileSync(destPath, 'utf8').trim();

      } else if (isText) {
        const destPath = path.join(DOWNLOAD_DIR, file.name);
        await downloadFile(drive, file.id, destPath);
        content = fs.readFileSync(destPath, 'utf8').trim();

      } else {
        content = `[Skipped — unsupported type: ${file.mimeType}]`;
      }

      results.push({ name: file.name, content });
      processed[file.id] = { name: file.name, processedAt: new Date().toISOString() };
      saveProcessed(processed);

    } catch (err) {
      console.error(`  ❌  Failed to process ${file.name}: ${err.message}`);
    }
  }

  // ── Print results ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('📋  NOTES CONTENT\n');

  for (const { name, content } of results) {
    console.log(`── ${name} ${'─'.repeat(Math.max(0, 55 - name.length))}`);
    console.log(content);
    console.log();
  }

  console.log('═'.repeat(60));
  console.log(`\n✅  Done. Processed ${results.length} note(s).`);
  console.log('   Copy the content above into Claude to make the changes.\n');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
