# Architecture

**Analysis Date:** 2025-03-04

## Pattern Overview

**Overall:** Layered React + TypeScript application with client-side state management and calculator-centric design.

**Key Characteristics:**
- Component-based UI with React 19 and React Router for routing
- Zustand store for state management (settings, bids, auth) with localStorage persistence
- Pure calculator functions in `src/core/calculators/` that accept pricing config and return results
- Firebase-based authentication and role management
- Mobile-first responsive design with Tailwind CSS

## Layers

**Presentation Layer:**
- Purpose: Render UI components, handle user input, display results
- Location: `src/components/` and `src/pages/`
- Contains: React components for calculators, settings, auth, results display
- Depends on: Store hooks, calculator functions, types
- Used by: React Router, main app

**Business Logic Layer:**
- Purpose: Calculate bid results, apply modifiers, compute materials
- Location: `src/core/calculators/` (pure functions)
- Contains: Functions like `calculateInteriorDetailed()`, `calculateExteriorSquareFootage()`, modifier application utilities
- Depends on: Type definitions, pricing settings, constants
- Used by: Calculator components, CalculatorPage

**State Management Layer:**
- Purpose: Persist and manage application state (settings, bids, auth)
- Location: `src/store/` (Zustand stores)
- Contains: Three stores: `settingsStore.ts`, `bidStore.ts`, `authStore.ts`
- Depends on: Firebase SDK, types, utils/bidMigration
- Used by: All components and pages

**Configuration & Constants:**
- Purpose: Define default values, static pricing, modifier constants
- Location: `src/core/constants/` and `src/config/`
- Contains: Default pricing, modifier values, paint types, coverage rates, Firebase config
- Depends on: Types
- Used by: Stores, calculators, components

**Utilities:**
- Purpose: Helper functions for data migration, PDF export, formatting
- Location: `src/utils/`
- Contains: `bidMigration.ts`, `exportPDF.ts`, `formatters.ts`
- Depends on: Types, jsPDF library
- Used by: Stores, components

**Type Definitions:**
- Purpose: TypeScript interfaces and type unions for type safety
- Location: `src/types/`
- Contains: `settings.types.ts`, `calculator.types.ts`, `bid.types.ts`
- Depends on: None
- Used by: All layers

## Data Flow

**Bidding Workflow:**

1. **User Navigation** → CalculatorPage with calculator type parameter
2. **Calculator Component Render** → Loads current settings from settingsStore
3. **Form Input** → User enters customer info, measurements, paint type, modifiers
4. **Calculation Trigger** → On form change or explicit calculation, calls pure calculator function
5. **Result Display** → Component renders BidSummary, materials, job duration, export buttons
6. **Save Bid** → User clicks save, bidStore.saveBid() persists with customer info and result
7. **Export/Reload** → Load from SavedBids page via bidStore.loadBid() with backward-compatibility migration

**Settings Configuration Flow:**

1. **Admin Access** → AdminRoute guards /settings page
2. **Settings Page** → Displays tabbed interface for all pricing configuration
3. **Modification** → User updates pricing, modifiers, line items, sections
4. **Store Update** → useSettingsStore methods (updatePricing, addLineItem, etc.) update state
5. **Persistence** → Zustand persist middleware auto-saves to localStorage as 'painting-company-settings'
6. **Rehydration** → On app load, `ensureNewPricingFields()` and `ensureDefaultSections()` handle migrations

**Authentication Flow:**

1. **App Init** → useAuthStore.initialize() sets up Firebase listener (onAuthStateChanged)
2. **Login Page** → User clicks "Sign in with Google"
3. **Google Auth** → signInWithGoogle() calls Firebase signInWithPopup()
4. **Domain Check** → Verifies email domain is 'texpainting.com'
5. **Role Lookup** → getUserRole() checks Firestore users collection, creates 'user' role on first login
6. **Protected Routes** → ProtectedRoute and AdminRoute components gate access
7. **Navigation** → Layout adapts based on user.role (shows Settings tab only for admins)

## Key Abstractions

**Calculator Functions:**
- Purpose: Encapsulate bid calculation logic independent of UI
- Examples: `src/core/calculators/interiorSquareFootage.ts`, `src/core/calculators/interiorDetailed.ts`, `src/core/calculators/perRoomDetailed.ts`
- Pattern: `calculate<Type>(inputs: TypeInputs, pricing: PricingSettings): BidResult`
- All accept pricing config as parameter; reference pricing.lineItems, pricing.interiorModifiers, etc. for dynamic rates

**Modifier Application:**
- Purpose: Separate concern of applying labor/material multipliers
- Examples: `src/core/calculators/utils/modifierApplications.ts` (applyInteriorModifiers, applyExteriorModifiers, applyDynamicModifiers)
- Pattern: Takes base labor/material, modifier config array, enabled flags; returns modified values + applied list
- Respects ModifierScope ('labor' | 'materials' | 'both')

**Line Items & Sections:**
- Purpose: Dynamic, configurable pricing beyond hardcoded rates
- Examples: Stored in PricingSettings.lineItems and PricingSettings.sections
- Pattern: Each line item has ID, name, rate, unit, category (section ID), isDefault flag, order
- Components query pricing.lineItems.filter() to render dynamic sections and apply custom line item costs

**Material Calculations:**
- Purpose: Compute gallons and costs for paint and supplies
- Examples: `src/core/calculators/utils/materialCalculations.ts`
- Pattern: Uses coverage rates from pricing (wallSqftPerGallon, cabinetGallonsPerDoor, etc.) and paint prices

## Entry Points

**Main Application:**
- Location: `src/main.tsx`
- Triggers: Browser loads app
- Responsibilities: React DOM root setup, ErrorBoundary wrap, render App component

**App Router:**
- Location: `src/App.tsx`
- Triggers: After authentication initialization
- Responsibilities: BrowserRouter setup, route definitions, layout wrapper, auth guard setup via useAuthStore.initialize()

**Calculator Page:**
- Location: `src/pages/CalculatorPage.tsx`
- Triggers: User navigates to `/calculator/:type`
- Responsibilities: Router params → fetch calculator component by type, load settings, manage currentBidData state, handle save/export

**Settings Page:**
- Location: `src/pages/Settings.tsx`
- Triggers: Admin user navigates to /settings (guarded by AdminRoute)
- Responsibilities: Render tabbed interface for pricing, line items, sections, company info; call useSettingsStore methods

**Login Page:**
- Location: `src/pages/Login.tsx`
- Triggers: Unauthenticated user accesses app
- Responsibilities: Display Google sign-in button, call useAuthStore.signInWithGoogle()

## Error Handling

**Strategy:** Combination of error boundaries, try-catch in async operations, and error state in stores.

**Patterns:**

- **Component Errors:** `src/components/common/ErrorBoundary.tsx` wraps entire app, catches React render errors
- **Auth Errors:** useAuthStore maintains error state, displayed on Login page; domain check prevents unauthorized access
- **Calculation Errors:** Calculator functions assume valid inputs; components validate via react-hook-form before calling
- **Bid Operations:** bidStore handles missing IDs gracefully; bidMigration handles backward-compatible data loading
- **Firebase Errors:** Caught in try-catch blocks within store methods; error state stored for UI display

## Cross-Cutting Concerns

**Logging:**
- No centralized logging framework; uses console where appropriate
- PDF export logs via downloadBidPDF/downloadCustomerPDF utilities

**Validation:**
- react-hook-form for form validation on calculator and settings pages
- Zod not currently used; basic type checking via TypeScript
- Input components sanitize via Input.tsx wrapper

**Authentication:**
- Firebase authentication with Google OAuth provider
- Role-based access: 'admin' can access settings, 'user' cannot
- Email domain restriction: only texpainting.com accounts allowed
- Firestore users collection tracks user roles and creation dates

**Data Persistence:**
- Zustand persist middleware with localStorage for settings and bids
- Firebase Firestore for user records and role management
- Backward-compatibility via bidMigration.ts when loading old bid formats

---

*Architecture analysis: 2025-03-04*
