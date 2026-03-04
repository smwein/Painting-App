# Technology Stack

**Analysis Date:** 2026-03-04

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code (React components, utilities, configuration)
- JSX/TSX - React component syntax in `src/components/` and `src/pages/`

**Secondary:**
- JavaScript - Configuration files (Vite, Tailwind, PostCSS, ESLint)
- HTML - Entry point and static assets

## Runtime

**Environment:**
- Node.js (version not specified in lockfile, inferred from package.json ecosystem)
- Browser (ES2022 target)

**Package Manager:**
- npm - Lockfile present: `package-lock.json`

## Frameworks

**Core:**
- React 19.2.0 - UI framework and component library
- React Router 7.13.1 - Client-side routing (in `src/pages/` directory)
- React DOM 19.2.0 - DOM rendering

**State Management:**
- Zustand 5.0.11 - Lightweight state management with persistence middleware
  - Used in `src/store/authStore.ts`, `src/store/settingsStore.ts`, `src/store/bidStore.ts`
  - Implements `persist` middleware for localStorage

**Forms & Validation:**
- React Hook Form 7.71.2 - Form state and validation
- @hookform/resolvers 5.2.2 - Schema validation adapters
- Zod 4.3.6 - TypeScript-first schema validation (used with React Hook Form)

**Styling:**
- Tailwind CSS 3.4.16 - Utility-first CSS framework
  - Config: `tailwind.config.js` with custom primary color palette (blue 50-900)
  - Content paths include `./src/**/*.{js,ts,jsx,tsx}`
- PostCSS 8.4.49 - CSS processing
- Autoprefixer 10.4.20 - Vendor prefix handling

**Build & Development:**
- Vite 7.3.1 - Build tool and dev server
  - Config: `vite.config.ts` with React plugin
- @vitejs/plugin-react 5.1.1 - React JSX support in Vite
- TypeScript compiler (tsc) - Pre-build type checking in `npm run build`

**Testing:**
- Vitest 4.0.18 - Unit/integration test runner
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/user-event 14.6.1 - User interaction simulation

**PDF Generation:**
- jsPDF 4.2.0 - PDF document creation and export (in `src/utils/exportPDF.ts`)

**Progressive Web App (PWA):**
- vite-plugin-pwa 1.2.0 - PWA support with Workbox service workers
  - Config: `vite.config.ts` includes PWA manifest and caching strategies
  - Caches Google Fonts with 1-year expiration

**Utilities:**
- clsx 2.1.1 - Conditional className helper
- date-fns 4.1.0 - Date manipulation and formatting

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Headless drag-and-drop primitive
- @dnd-kit/sortable 10.0.0 - Sortable lists and reordering
- @dnd-kit/utilities 3.2.2 - Helper utilities

**Server:**
- serve 14.2.5 - Production HTTP server for `npm start` (serves `dist/` on port 8080)

## Key Dependencies

**Critical:**
- Firebase 12.10.0 - Backend services including Auth and Firestore
  - `src/config/firebase.ts` initializes with project-specific credentials
  - Required environment variables: VITE_FIREBASE_* keys in `.env.local`

**Infrastructure:**
- Zustand persist middleware - Enables localStorage-based state persistence for bids and settings
- Zod validation - Ensures type-safe data throughout the application

## Configuration

**Environment:**
- Vite environment variables via VITE_* prefix in `.env.local`
- Firebase configuration via `src/config/firebase.ts` (hardcoded for texpainting-bid project)
- Required env vars from `.env.example`:
  - VITE_FIREBASE_API_KEY
  - VITE_FIREBASE_AUTH_DOMAIN
  - VITE_FIREBASE_PROJECT_ID
  - VITE_FIREBASE_STORAGE_BUCKET
  - VITE_FIREBASE_MESSAGING_SENDER_ID
  - VITE_FIREBASE_APP_ID

**Build:**
- `tsconfig.json` - TypeScript references for app and node configs
- `tsconfig.app.json` - App-specific TypeScript config (target ES2022, strict mode)
- `eslint.config.js` - ESLint configuration with TypeScript, React hooks, React Refresh support
- `tailwind.config.js` - Tailwind CSS theme customization
- `postcss.config.js` - PostCSS plugin configuration (Tailwind, Autoprefixer)

## Platform Requirements

**Development:**
- Node.js (latest LTS recommended)
- npm 6+ (package manager)
- Modern web browser supporting ES2022
- `.env.local` file with Firebase credentials

**Production:**
- Node.js runtime (for `serve` production server)
- Deployment target: DigitalOcean App Platform (via CI/CD)
  - GitHub Actions workflow: `.github/workflows/deploy-notify.yml`
  - Builds with: `npm run build` → outputs to `dist/`
  - Started with: `npm start` → serves on port 8080

## Scripts

**Development:**
- `npm run dev` - Start Vite dev server with HMR
- `npm run preview` - Preview production build locally
- `npm run build` - Compile TypeScript and build with Vite
- `npm run lint` - Run ESLint across entire project
- `npm run notes` - Process notes with custom Node.js script (`scripts/process-notes.mjs`)

---

*Stack analysis: 2026-03-04*
