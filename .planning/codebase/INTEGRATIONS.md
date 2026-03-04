# External Integrations

**Analysis Date:** 2026-03-04

## APIs & External Services

**Google Authentication:**
- Google Sign-In - User authentication and account management
  - SDK/Client: Firebase Auth with `GoogleAuthProvider`
  - Implementation: `src/config/firebase.ts` and `src/store/authStore.ts`
  - Auth method: OAuth 2.0 popup flow with forced account selection
  - Domain restriction: Only `texpainting.com` email addresses allowed

**Deployment Notifications:**
- DigitalOcean API - Deployment status polling
  - Integration: `.github/workflows/deploy-notify.yml`
  - Auth: `DO_API_TOKEN` (GitHub Actions secret)
  - Endpoint: `https://api.digitalocean.com/v2/apps/{app_id}/deployments`
  - Purpose: Monitor deployment phase transitions (ACTIVE/ERROR/FAILED/CANCELED)

- ntfy.sh (Ntfy) - Push notifications for deployment status
  - Integration: `.github/workflows/deploy-notify.yml`
  - Auth: Topic token via `NTFY_TOPIC` (GitHub Actions secret)
  - Endpoint: `https://ntfy.sh/{topic}`
  - Purpose: Send deployment success/failure/timeout notifications to development team

## Data Storage

**Databases:**
- Firestore (Google Cloud) - NoSQL document database
  - Connection: Initialized in `src/config/firebase.ts`
  - Client: Firebase SDK (`firebase/firestore`)
  - Collections:
    - `users/` - User profiles with roles (admin/user)
      - Fields: uid, email, role, createdAt
      - Rules: `firestore.rules` enforce auth-based access control
  - Authentication: Firebase Auth-based (only authenticated users)

**Local Storage:**
- Browser localStorage - Persists application state between sessions
  - Used via Zustand's `persist` middleware in stores
  - Persisted data:
    - Bid data: `src/store/bidStore.ts`
    - Settings/pricing: `src/store/settingsStore.ts`
  - Fallback: Enables offline functionality

**File Storage:**
- Local filesystem only - No cloud file storage integrated
- PDF exports: Generated client-side and downloaded via browser

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication - Managed authentication service
  - Implementation: `src/store/authStore.ts` with Zustand store
  - Methods:
    - Google OAuth via `signInWithPopup()`
    - Custom domain validation (texpainting.com only)
    - Automatic user record creation on first sign-in
  - Role-based access control:
    - Roles: `admin`, `user`
    - Stored in Firestore `users/{uid}` document
    - Admin users can manage other users' roles via `updateUserRole()`
  - Sign-out: `firebaseSignOut()` clears auth state

**Authorization:**
- Custom role-based access (RBAC)
  - File: `src/store/authStore.ts`
  - Roles: `admin` (manage users), `user` (default)
  - Implementation: Manual role assignment in Firestore console
  - Checked on: `user.role` property after auth state change

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service configured (no Sentry, Rollbar, etc.)

**Logs:**
- Console logging only - No centralized logging service
- Browser DevTools available for development
- No server-side logging infrastructure

**Analytics:**
- Not detected - No analytics service integrated (no Google Analytics, Mixpanel, etc.)

## CI/CD & Deployment

**Hosting:**
- DigitalOcean App Platform - Container-based deployment
  - Deployment trigger: Push to `main` branch
  - Auto-deploy: Enabled with GitHub integration
  - App ID: Stored as `DO_APP_ID` in GitHub Actions secrets

**CI Pipeline:**
- GitHub Actions - CI/CD automation
  - Workflow: `.github/workflows/deploy-notify.yml`
  - Trigger: On push to `main` branch
  - Jobs:
    1. Wait for DigitalOcean deployment (polls for ACTIVE/ERROR status, up to 15 minutes)
    2. Send ntfy notification with result and commit message
  - Secrets required:
    - `DO_API_TOKEN` - DigitalOcean API authentication
    - `DO_APP_ID` - DigitalOcean App ID
    - `NTFY_TOPIC` - Ntfy.sh topic for notifications

**Build Process:**
- Local: `npm run build` → TypeScript compilation + Vite bundling → `dist/`
- Production: Automatic via DigitalOcean (detected from repo structure)

## Environment Configuration

**Required env vars:**
Critical for local development:
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID

GitHub Actions secrets (for deployment):
- `DO_API_TOKEN` - DigitalOcean API token
- `DO_APP_ID` - DigitalOcean App ID
- `NTFY_TOPIC` - Ntfy.sh topic for notifications

**Secrets location:**
- Development: `.env.local` (not committed, Git-ignored)
- CI/CD: GitHub Actions Secrets (encrypted, accessible only in workflows)
- Firebase config: Hardcoded in `src/config/firebase.ts` (public safe, project-specific)

## Webhooks & Callbacks

**Incoming:**
- GitHub webhook (implicit) - Triggered on push to `main`
  - Invokes: DigitalOcean auto-deploy
  - Monitored by: GitHub Actions workflow

**Outgoing:**
- None directly from application
- CI/CD notifications: ntfy.sh receives POST with deployment status (via GitHub Actions)

## Rate Limits & Quotas

**Firebase:**
- Firestore: Free tier - 50k reads/day, 20k writes/day
- Auth: No documented limits for sign-in operations
- Storage: Not used

**DigitalOcean:**
- API rate limits apply per organization
- Polling interval: 30 seconds in CI/CD workflow (respects API quotas)

**Ntfy.sh:**
- Public service - No authentication required for publishing
- Rate limits: Not documented in workflow (posts once per deployment)

---

*Integration audit: 2026-03-04*
