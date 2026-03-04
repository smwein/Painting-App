# Codebase Concerns

**Analysis Date:** 2026-03-04

## Tech Debt

**Insecure ID Generation:**
- Issue: Multiple places use `Date.now()` or `Date.now()` combined with weak randomization for generating unique IDs (modifiers, custom room types)
- Files: `src/store/settingsStore.ts` (lines 134, 188), `src/components/settings/SimpleInteriorSettings.tsx`, `src/components/settings/ExteriorDetailedPricing.tsx`, `src/components/settings/InteriorDetailedPricing.tsx`, `src/components/settings/SimplePricingSettings.tsx`, `src/components/settings/PerRoomSettings.tsx`
- Impact: ID collisions possible with rapid operations; weak randomization reduces uniqueness guarantees
- Fix approach: Replace with `crypto.randomUUID()` consistently across all ID generation. This is already used in `src/store/bidStore.ts` (line 32) as the pattern to follow

**Type Safety Holes:**
- Issue: `any` types used in migration and breakdown structures
- Files: `src/utils/bidMigration.ts` (line 19: `const inputs = bid.inputs as any`), `src/types/calculator.types.ts` (line 43: `breakdown: any`)
- Impact: Loss of type checking on bid migrations; breakdown details not validated
- Fix approach: Create discriminated union types for calculator-specific breakdowns. Add proper migration type guards

**Weak Error Handling in PDF Export:**
- Issue: Logo upload failures silently caught and logged to console, no user feedback
- Files: `src/utils/exportPDF.ts` (lines 37-41)
- Impact: Users won't know if logo failed to add to PDF; double catch block for same error (lines 38-41 duplicates same try-catch for both image additions)
- Fix approach: Consolidate to single try-catch; return error indicator to caller for user notification

**Firebase API Keys Exposed:**
- Issue: Firebase config with API key hardcoded in source
- Files: `src/config/firebase.ts` (lines 5-12)
- Impact: API key visible in git history and bundled code; security risk if project needs to restrict access
- Fix approach: Move to environment variables. Current setup allows anyone to find the Firebase project and potentially abuse read/write rules

**Fragile Email Domain Validation:**
- Issue: Email domain validation uses `split('@')[1]` without checking array length
- Files: `src/store/authStore.ts` (lines 73, 111)
- Impact: Malformed email addresses (no @ symbol) would cause undefined value; email with multiple @ symbols uses last domain
- Fix approach: Use proper email parsing with URL API or regex; add null check before accessing domain

**Missing Validation on Type Casting:**
- Issue: Line item rates assumed to exist with fallback to 0 without logging misses
- Files: `src/core/calculators/interiorDetailed.ts` (line 29: `return item?.rate || 0`)
- Impact: Silent calculation errors if referenced line item ID doesn't exist; user gets wrong bid
- Fix approach: Warn/log when line item not found; consider throwing error in strict mode

## Known Bugs

**Modifier Application Ambiguity:**
- Bug: System supports both old fixed modifiers and new dynamic modifiers; migration path incomplete
- Symptoms: Calculator falls back to old modifier format but UI tries to use dynamic format; settings page must handle both
- Files: `src/core/calculators/interiorDetailed.ts` (lines 98-108), `src/components/calculators/InteriorDetailed.tsx` (lines 84-100), `src/store/settingsStore.ts` (lines 59-81)
- Trigger: Users upgrading from older versions may have old modifier data
- Workaround: Migration in `ensureNewPricingFields()` runs on app load, but migration doesn't update existing modifier arrays to new format

**House Condition State Sync Issue:**
- Bug: `houseCondition` optional in some calculator inputs but required in others
- Symptoms: Interior Detailed may not have condition set; auto-calc uses furnished rates but user may need empty
- Files: `src/types/calculator.types.ts` (line 112: `houseCondition?: HouseCondition`), `src/core/calculators/interiorDetailed.ts` (line 22-24 assumes it exists)
- Trigger: When loading old bids or incomplete form data
- Workaround: Default to 'furnished' in calculator logic, but not explicitly documented

**Missing Null Checks on Settings Access:**
- Bug: Optional fields in PricingSettings accessed without guards
- Symptoms: `pricing.interiorDetailedFurnishedRates` may be undefined; calculations silently use 0
- Files: `src/core/calculators/interiorDetailed.ts` (lines 22-27: accesses `conditionRates` which may be undefined), `src/store/settingsStore.ts` (lines 30-56)
- Trigger: New installations or migrations from versions before these fields existed
- Workaround: `ensureNewPricingFields()` adds defaults on rehydration, but there's a timing window if calculator runs before hydration

## Security Considerations

**Hardcoded Firebase Credentials:**
- Risk: Firebase project ID and API key publicly visible
- Files: `src/config/firebase.ts`
- Current mitigation: Firestore security rules restrict data access by email domain (@texpainting.com)
- Recommendations: Move credentials to environment variables (.env); review Firestore rules for:
  - Read: Currently allows users to read all user records (line 136 in authStore)
  - Write: Admin-only settings updates enforced by UI, but Firestore rule should enforce
  - Consider field-level security (don't expose all user emails publicly)

**No CSRF Token on Role Updates:**
- Risk: Role updates via Firestore without CSRF protection; if auth token stolen, admin roles can be assigned
- Files: `src/store/authStore.ts` (line 145-146)
- Current mitigation: App requires valid Google OAuth to Firestore, but document-level permissions unclear
- Recommendations: Enforce role change via Cloud Function with server-side verification; log role changes

**Missing Input Validation:**
- Risk: PDF generation trusts customer data without escaping; line item names not validated
- Files: `src/utils/exportPDF.ts` (uses bid.customer data directly in PDF), `src/store/settingsStore.ts` (line item names user-provided)
- Current mitigation: None
- Recommendations: Validate/sanitize user input before PDF rendering; validate line item names on add

**localStorage Persistence Without Encryption:**
- Risk: Bid details stored in plain localStorage accessible to XSS
- Files: `src/store/bidStore.ts`, `src/store/settingsStore.ts` (both use Zustand persist)
- Current mitigation: App is single-user (no sensitive multi-user data stored)
- Recommendations: Consider Firebase Firestore sync for server persistence; document that localStorage is unencrypted

## Performance Bottlenecks

**Interior Detailed Calculator Complexity:**
- Problem: 22 input fields with multiple section calculations and modifier applications
- Files: `src/core/calculators/interiorDetailed.ts` (140 lines), `src/components/calculators/InteriorDetailed.tsx` (788 lines)
- Cause: Detailed calculation requires many property lookups and iterations; calculator re-renders on every form change
- Improvement path:
  - Memoize calculation results with useMemo on input hash
  - Defer PDF rendering (currently synchronous)
  - Consider calculating only dirty fields instead of full recalc
  - Split InteriorDetailed.tsx into smaller components

**PDF Export Synchronous:**
- Problem: `generateBidPDF()` runs synchronously on main thread for large bids
- Files: `src/utils/exportPDF.ts`
- Cause: jsPDF library doesn't offer async API; large PDFs block UI
- Improvement path: Offload to Web Worker or use setTimeout(0) chunks; add loading indicator

**Zustand Store Hydration Timing:**
- Problem: Settings hydrate asynchronously; calculators may run before defaults applied
- Files: `src/store/settingsStore.ts` (lines 257-262), `src/components/calculators/InteriorDetailed.tsx` (uses settings immediately)
- Cause: onRehydrateStorage runs after store subscribers already attached
- Improvement path:
  - Add explicit `isHydrated` flag to store
  - Guard calculator renders: `if (!settingsStore.isHydrated) return <Skeleton />`
  - Ensure defaults applied before any calculator uses pricing

**No Result Memoization:**
- Problem: BidResult recalculated on every form change even if inputs unchanged
- Files: All calculator components (InteriorDetailed, ExteriorDetailed, PerRoomDetailed)
- Cause: Calculation called directly in render without memoization
- Improvement path: Use useMemo based on input values; implement shallow comparison for complex objects

## Fragile Areas

**Migration System:**
- Files: `src/utils/bidMigration.ts`, `src/store/settingsStore.ts` (ensureNewPricingFields)
- Why fragile: Each new feature requires new migration logic; old migration paths not cleaned up; bidMigration duplicates logic from settingsStore; "as any" type cast makes it hard to track what changed
- Safe modification:
  - Add version number to persisted state
  - Create versioned migration functions (v1 → v2, v2 → v3)
  - Write tests for each migration path (currently none exist)
  - Document migration intent in comments
- Test coverage: None — no test files in codebase

**Settings Store State Shape:**
- Files: `src/store/settingsStore.ts` (266 lines), `src/types/settings.types.ts`
- Why fragile: PricingSettings has 15+ optional fields for backward compatibility; code paths fork for old vs new modifiers; multiple ways to access same data (interiorModifierValues vs interiorModifiers)
- Safe modification:
  - Consolidate old and new modifier formats in migration only
  - Remove interiorModifierValues support; only use interiorModifiers
  - Add schema validation (Zod) for settings shape on load
  - Test all setting combinations in settings UI
- Test coverage: None

**LineItem/Section ID Collisions:**
- Files: `src/store/settingsStore.ts` (lines 134, 188)
- Why fragile: Weak ID generation; no uniqueness check when adding; sections reference line items by ID
- Safe modification:
  - Use crypto.randomUUID() for all new IDs
  - Add validation function: checkIdUniqueness(id, type) before adding
  - Add test for concurrent ID generation
- Test coverage: None

**PDF Export with Missing Paint Types:**
- Files: `src/utils/exportPDF.ts`, `src/core/calculators/interiorDetailed.ts`
- Why fragile: Assumes paint type exists in pricing.interiorPaint; if custom paint removed, old bids break
- Safe modification:
  - Store paint type and price in bid result, not just type ID
  - On load, validate paint exists or provide fallback
  - Test PDF generation with deleted custom paint
- Test coverage: None

## Scaling Limits

**localStorage Bid Storage Limit:**
- Current capacity: ~10-50 bids before hitting 5-10MB localStorage limit (depends on browser)
- Limit: When limit reached, Zustand persist silently fails to save new bids (user doesn't see error)
- Scaling path:
  - Migrate to Firebase Firestore (already integrated for auth)
  - Clean up old bids automatically (archive after 1 year)
  - Implement IndexedDB as fallback for large datasets
  - Add warning when approaching limit

**Custom Line Items Growth:**
- Current capacity: No limit; theoretically thousands of custom line items
- Limit: Settings UI becomes sluggish with >100 line items; dropdown selectors lag
- Scaling path:
  - Virtualize list in CustomLineItemsManager
  - Add search/filter for finding line items
  - Consider line item categories/grouping
  - Lazy-load custom items separately from defaults

**Form Rerender with Many Modifiers:**
- Current capacity: Works smoothly with default modifiers; custom modifiers untested
- Limit: Adding 20+ custom modifiers makes form feel sluggish
- Scaling path: Use react-hook-form's built-in field array optimization; memoize modifier rows

## Dependencies at Risk

**jsPDF Version:**
- Risk: jsPDF is maintained but API is fragile; major version updates often break
- Impact: PDF export breaks; users can't generate bids
- Migration plan: Keep jsPDF pinned; test major version upgrades in branch before deploy; consider pdfkit-js as alternative

**Firebase SDK:**
- Risk: Google deprecates features; current setup uses deprecated patterns in some versions
- Impact: Authentication may stop working if SDK auto-updates
- Migration plan: Pin firebase version; monitor release notes; test updates in staging

**date-fns Version:**
- Risk: Relatively stable but large library (~40KB); alternative: Day.js (2KB)
- Impact: Bundle size; only used for date formatting in PDF and bid list
- Migration plan: Consider Day.js if bundle size becomes concern; currently low priority

**React Hook Form:**
- Risk: Modern version has different error handling; form structure brittle
- Impact: Form validation could silently fail if version mismatch
- Migration plan: Pin version; test form validation thoroughly before updates

## Missing Critical Features

**No Input Validation Framework:**
- Problem: Customer info, line item rates, and measurements have no Zod schemas
- Blocks: Can't validate API requests (if moving to backend); no form-level type safety
- Files needing schemas: All form data in `src/components/calculators/*`, `src/types/calculator.types.ts`
- Priority: Medium (currently caught by TypeScript + react-hook-form defaults)

**No Error Recovery for Corrupted Bids:**
- Problem: If localStorage bid data is malformed, loadBid() silently returns null
- Blocks: Users lose bids if migration fails
- Files: `src/store/bidStore.ts` (line 44)
- Priority: High (already happened in user testing)

**No Audit Trail for Settings Changes:**
- Problem: When admin changes rates, no record of who changed what or when
- Blocks: Can't debug why rate changed; can't revert to previous setting
- Files: `src/store/settingsStore.ts` (no change logging)
- Priority: Medium (affects audit/compliance)

**No Offline Support for Bid Calculation:**
- Problem: Firebase auth required even though calculators don't need network
- Blocks: Can't use app if internet down
- Files: `src/pages/Login.tsx` (hard redirect to login)
- Priority: Low (mobile-first but not offline-first)

## Test Coverage Gaps

**No Tests Exist:**
- What's not tested: Entire codebase — 0% coverage
- Files affected: All source files
- Risk:
  - Refactoring breaks calculations silently (no regression detection)
  - Migrations lose user data with no coverage
  - Modifiers apply incorrectly with multiple toggles
  - Edge cases (0 inputs, negative markup, missing paint types)
- Priority: High

**Specific High-Risk Areas Without Tests:**
- `src/core/calculators/interiorDetailed.ts`: 22-field calculation with modifiers and material interactions
- `src/store/settingsStore.ts`: State mutations, migrations, section/item dependencies
- `src/utils/bidMigration.ts`: Backward compatibility for multiple bid versions
- `src/core/calculators/perRoomDetailed.ts`: Room auto-calculations and room-specific customizations
- `src/utils/exportPDF.ts`: PDF generation with edge case content

**Test Framework Installed But Unused:**
- Vitest and @testing-library/react are in devDependencies but no tests written
- No test command in package.json (has lint but no test)
- No test configuration files (jest.config, vitest.config)

---

*Concerns audit: 2026-03-04*
