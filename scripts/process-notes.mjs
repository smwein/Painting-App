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
import { execSync } from 'child_process';
import readline from 'readline';
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

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(ans); });
  });
}

async function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error(`
❌  Missing credentials file: scripts/google-credentials.json

To set up:
  1. Go to https://console.cloud.google.com/apis/credentials?project=texpainting-bid
  2. Click "Create Credentials" → "OAuth client ID"
  3. Application type: "Desktop app" → name it "Notes Script" → Create
  4. Click the download icon (⬇) next to the new credential
  5. Save the downloaded JSON as:  scripts/google-credentials.json
  6. Also enable the Drive API at:
     https://console.cloud.google.com/apis/library/drive.googleapis.com?project=texpainting-bid
`);
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
  const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;

  const oauth2 = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Use stored token if available
  if (fs.existsSync(TOKEN_FILE)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    oauth2.setCredentials(token);
    // Refresh if expired
    oauth2.on('tokens', (newTokens) => {
      const existing = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      fs.writeFileSync(TOKEN_FILE, JSON.stringify({ ...existing, ...newTokens }, null, 2));
    });
    return oauth2;
  }

  // First run: open browser for consent
  const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\n🔐  First-time setup: open this URL in your browser to authorize:\n');
  console.log('  ', authUrl, '\n');

  const code = await prompt('Paste the authorization code here: ');
  const { tokens } = await oauth2.getToken(code.trim());
  oauth2.setCredentials(tokens);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log('✅  Token saved. You won\'t need to do this again.\n');

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
