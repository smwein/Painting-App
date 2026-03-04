# Codebase Structure

**Analysis Date:** 2025-03-04

## Directory Layout

```
src/
├── App.tsx                           # Root router component (BrowserRouter, route definitions)
├── main.tsx                          # Entry point (React DOM root, ErrorBoundary)
├── index.css                         # Global styles (Tailwind imports)
│
├── pages/                            # Page-level components (routed)
│   ├── Home.tsx                      # Calculator selection grid (links to /calculator/:type)
│   ├── CalculatorPage.tsx            # Router switch for 5 calculators, bid management
│   ├── SavedBids.tsx                 # List/load/delete saved bids
│   ├── Settings.tsx                  # Admin-only tabbed settings interface
│   └── Login.tsx                     # Google authentication page
│
├── components/
│   ├── common/                       # Reusable UI components
│   │   ├── Layout.tsx                # Main page wrapper (header, nav, content area)
│   │   ├── Card.tsx                  # Card container (CardHeader, CardTitle, CardContent)
│   │   ├── Button.tsx                # Styled button component
│   │   ├── Input.tsx                 # Styled form input
│   │   ├── Select.tsx                # Styled dropdown/select
│   │   └── ErrorBoundary.tsx         # Catch React render errors
│   │
│   ├── calculators/                  # 5 main calculator UI components
│   │   ├── InteriorSquareFootage.tsx # Simple interior (house SF → pricing options)
│   │   ├── InteriorDetailed.tsx      # Detailed interior (22 measurements)
│   │   ├── ExteriorSquareFootage.tsx # Simple exterior (house SF → pricing)
│   │   ├── ExteriorDetailed.tsx      # Detailed exterior (measurements + modifiers)
│   │   ├── PerRoomDetailed.tsx       # Per-room interior (room types, collapsible)
│   │   │
│   │   └── shared/                   # Shared calculator UI sections
│   │       ├── CustomerInfoSection.tsx # Name, address, phone, email, date, notes
│   │       ├── ModifierSection.tsx   # Checkbox list for labor modifiers
│   │       ├── PaintTypeSelector.tsx # Dropdown for paint type (uses pricing.interiorPaint, etc.)
│   │       └── MarkupSelector.tsx    # Markup percentage selector
│   │
│   ├── results/                      # Bid result display components
│   │   ├── BidSummary.tsx            # Labor, Material, Profit, Retail Total
│   │   ├── PaintGallonsEstimate.tsx  # Yellow card showing paint gallons
│   │   ├── JobDurationEstimate.tsx   # Days estimate based on crew rate
│   │   ├── CostBreakdown.tsx         # Itemized labor costs by line item
│   │   ├── PreMarkupBreakdown.tsx    # Costs before markup applied
│   │   ├── EnhancedTotalsSection.tsx # Summary with percentages
│   │   └── ExportButtons.tsx         # Save & PDF export buttons
│   │
│   ├── settings/                     # Settings page tab components (admin only)
│   │   ├── CompanyInfoSettings.tsx   # Company name, address, phone, email, logo
│   │   ├── SimplePricingSettings.tsx # Interior/Exterior sqft rates (furnished + empty)
│   │   ├── SimpleInteriorSettings.tsx# Variant for interior simple settings
│   │   ├── SimpleExteriorSettings.tsx# Variant for exterior simple settings
│   │   ├── DetailedPricingSettings.tsx # Interior detailed furnished/empty rates
│   │   ├── InteriorDetailedPricing.tsx # Detailed interior configuration
│   │   ├── ExteriorDetailedPricing.tsx # Detailed exterior configuration
│   │   ├── CustomLineItemsManager.tsx # Add/edit/delete line items
│   │   ├── CustomSectionsManager.tsx # Add/edit/delete sections
│   │   ├── JobEstimationSettings.tsx # Crew rates, formula text
│   │   ├── PerRoomSettings.tsx       # Per-room multipliers
│   │   └── UsersSettings.tsx         # Admin role management
│   │
│   └── auth/                         # Authentication components
│       ├── ProtectedRoute.tsx        # Requires logged-in user
│       └── AdminRoute.tsx            # Requires admin role
│
├── store/                            # Zustand state management (localStorage persisted)
│   ├── settingsStore.ts              # Pricing, line items, sections, company info (persist: 'painting-company-settings')
│   ├── bidStore.ts                   # Saved bids CRUD (persist: 'painting-bids')
│   └── authStore.ts                  # User, auth status, Firebase listener (no persist; Firebase is source of truth)
│
├── core/
│   ├── calculators/                  # Pure calculator functions
│   │   ├── interiorSquareFootage.ts  # calculate<type>() for simple interior
│   │   ├── interiorDetailed.ts       # Calculate interior detailed 22-measurement bid
│   │   ├── exteriorSquareFootage.ts  # Calculate simple exterior
│   │   ├── exteriorDetailed.ts       # Calculate detailed exterior
│   │   ├── perRoomDetailed.ts        # Calculate per-room interior
│   │   │
│   │   └── utils/
│   │       ├── modifierApplications.ts # applyInteriorModifiers(), applyExteriorModifiers(), applyDynamicModifiers()
│   │       └── materialCalculations.ts # Material gallons/costs for paint and supplies
│   │
│   └── constants/
│       ├── defaultPricing.ts         # createDefaultPricingSettings(), getDefaultCompanySettings()
│       ├── pricing.ts                # Base rate constants (hardcoded fallback)
│       ├── coverage.ts               # Paint coverage rates (gallons per sqft/lf)
│       └── modifiers.ts              # Modifier multiplier constants (INTERIOR_MODIFIERS, EXTERIOR_MODIFIERS)
│
├── types/
│   ├── settings.types.ts             # LineItemConfig, SectionConfig, PricingSettings, CompanySettings, ModifierScope
│   ├── calculator.types.ts           # CalculatorType, BidResult, InteriorSqftInputs, InteriorDetailedInputs, etc.
│   └── bid.types.ts                  # CustomerInfo, Bid, BidListItem, CalculatorInputs union
│
├── config/
│   └── firebase.ts                   # Firebase app init, auth, db, googleProvider
│
├── utils/
│   ├── bidMigration.ts               # migrateBidToCurrentVersion() for backward compatibility
│   ├── exportPDF.ts                  # downloadBidPDF(), downloadCustomerPDF() using jsPDF
│   └── formatters.ts                 # Utility formatters (if any)
│
└── assets/
    └── [images, SVGs if any]
```

## Directory Purposes

**`src/pages/`:**
- Purpose: Top-level page components rendered by React Router
- Contains: Home, CalculatorPage, SavedBids, Settings, Login
- Key files: `CalculatorPage.tsx` imports calculator components dynamically

**`src/components/common/`:**
- Purpose: Reusable UI building blocks (Button, Input, Card, Select)
- Contains: Layout with header/nav/footer, error boundary
- Key files: `Layout.tsx` is wrapper for all protected pages

**`src/components/calculators/`:**
- Purpose: 5 calculator UI forms + shared sections
- Contains: Each calculator renders form fields, calls calculator function, displays BidSummary + results
- Key files: Each calculator imports from `shared/` and uses ModifierSection, PaintTypeSelector, etc.

**`src/components/results/`:**
- Purpose: Display bid calculation results
- Contains: BidSummary (totals), CostBreakdown (itemized), PaintGallonsEstimate, JobDurationEstimate
- Key files: Used by all calculators; ExportButtons handles PDF download

**`src/components/settings/`:**
- Purpose: Settings page tabs for admin configuration
- Contains: Forms for pricing, line items, sections, company info
- Key files: Each tab imports from useSettingsStore for CRUD

**`src/core/calculators/`:**
- Purpose: Pure business logic functions
- Contains: 5 calculator functions + utils for modifiers and materials
- Key files: All accept `pricing: PricingSettings` parameter; reference `pricing.lineItems`, `pricing.interiorModifiers`, etc.

**`src/store/`:**
- Purpose: Zustand stores (client-side state)
- Contains: Settings (company + pricing), Bids (saved CRUD), Auth (user + roles)
- Key files: `settingsStore.ts` with ensureNewPricingFields() migration logic

**`src/core/constants/`:**
- Purpose: Default values, hardcoded fallbacks, configuration
- Contains: Default pricing, modifier constants, coverage rates
- Key files: `defaultPricing.ts` is single source of truth for default PricingSettings

**`src/types/`:**
- Purpose: TypeScript type safety
- Contains: 3 type files covering settings, calculators, bids
- Key files: `settings.types.ts` defines LineItemConfig, SectionConfig, PricingSettings structure

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React app bootstrap
- `src/App.tsx`: Router and auth initialization
- `src/pages/Home.tsx`: First page users see (calculator selection)

**Configuration:**
- `src/core/constants/defaultPricing.ts`: All default values
- `src/config/firebase.ts`: Firebase credentials and SDK setup

**Core Logic:**
- `src/core/calculators/interiorSquareFootage.ts`: Interior simple calculator
- `src/core/calculators/interiorDetailed.ts`: Interior detailed 22-measurement calculator
- `src/core/calculators/perRoomDetailed.ts`: Per-room calculator
- `src/core/calculators/utils/modifierApplications.ts`: Modifier multiplier logic

**Testing:**
- Test files co-located with source (e.g., `src/core/calculators/*.test.ts` if any)

## Naming Conventions

**Files:**
- Pages: PascalCase.tsx (e.g., `CalculatorPage.tsx`)
- Components: PascalCase.tsx (e.g., `BidSummary.tsx`)
- Store files: camelCase.ts (e.g., `settingsStore.ts`)
- Utils: camelCase.ts (e.g., `bidMigration.ts`)
- Type files: camelCase.types.ts (e.g., `calculator.types.ts`)

**Directories:**
- Multi-word: kebab-case (e.g., `saved-bids` becomes `SavedBids.tsx` file)
- Feature grouping: lowercase (e.g., `components/calculators/`, `store/`)

**Functions:**
- Calculator functions: `calculate<Type>()` (e.g., `calculateInteriorSquareFootage()`)
- Store methods: camelCase (e.g., `updatePricing()`, `addLineItem()`)
- Utility functions: camelCase (e.g., `migrateBidToCurrentVersion()`, `downloadBidPDF()`)

**Variables & Types:**
- Types/Interfaces: PascalCase (e.g., `BidResult`, `InteriorSqftInputs`)
- Enums/Constants: UPPER_SNAKE_CASE (e.g., `ALLOWED_DOMAIN`, `INTERIOR_MODIFIERS`)
- React hooks: `use<Name>()` (e.g., `useSettingsStore()`, `useAuthStore()`)

## Where to Add New Code

**New Feature (e.g., new calculator type):**
- Primary code: `src/core/calculators/new<Type>.ts` (pure function)
- Component UI: `src/components/calculators/New<Type>.tsx` (form + result display)
- Type definitions: Add to `src/types/calculator.types.ts`
- Router: Add route to `src/App.tsx` Routes and CalculatorPage switch
- Home page: Add card to calculatorOptions array in `src/pages/Home.tsx`

**New Custom Line Item / Section:**
- Settings UI: Already handled in `src/components/settings/CustomLineItemsManager.tsx` and `CustomSectionsManager.tsx`
- Storage: useSettingsStore handles addLineItem() and addSection() CRUD
- No new files needed; add to existing flow

**New Modifier Type:**
- Settings UI: Add field to modifier editor in settings
- Calculator function: Update relevant `src/core/calculators/` function to apply new modifier
- Type definition: Update `InteriorModifiers` or `ExteriorModifiers` in `src/types/calculator.types.ts`

**Utilities & Helpers:**
- Shared helpers: `src/utils/` (e.g., formatters, validators)
- Calculator-specific utils: `src/core/calculators/utils/` (e.g., materialCalculations.ts)

**Components:**
- Pages: `src/pages/` (routed pages)
- Feature components: `src/components/<feature>/` (e.g., calculators, results, settings)
- Reusable UI: `src/components/common/`

## Special Directories

**`src/public/`:**
- Purpose: Static assets (favicon, PWA icons)
- Generated: No
- Committed: Yes

**`dist/`:**
- Purpose: Build output (compiled and bundled app)
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)

**`src/assets/`:**
- Purpose: Images and static resources referenced in code
- Generated: No
- Committed: Yes

---

*Structure analysis: 2025-03-04*
