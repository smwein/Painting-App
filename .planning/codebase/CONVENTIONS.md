# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- PascalCase for React components: `Button.tsx`, `ErrorBoundary.tsx`, `InteriorDetailed.tsx`
- camelCase for utilities and core logic: `formatters.ts`, `bidMigration.ts`, `interiorSquareFootage.ts`
- camelCase for store files: `settingsStore.ts`, `authStore.ts`, `bidStore.ts`
- camelCase for type definition files: `settings.types.ts`, `calculator.types.ts`, `bid.types.ts`
- camelCase for constant directories: `constants/pricing.ts`, `constants/coverage.ts`, `constants/modifiers.ts`

**Functions:**
- camelCase for all functions: `calculateInteriorSquareFootage`, `formatCurrency`, `applyInteriorModifiers`
- Exported calculator functions named `calculateX`: `calculateInteriorDetailed`, `calculatePerRoom`, `calculateExteriorDetailed`
- Helper functions use camelCase: `migrateBidToCurrentVersion`, `ensureDefaultSections`, `getAllRoomTypes`

**Variables & Parameters:**
- camelCase for all variables and parameters
- Single letter variables only in loops: `i`, `d`, `m` (e.g., `map((i) => i.id)`)
- Use descriptive names for state variables: `houseSquareFootage`, `ceilingSqft`, `customItemValues`
- Boolean variables prefixed with `is`, `has`, or `should`: `isDragging`, `hasError`, `shouldCollapse`, `isDefault`

**Types & Interfaces:**
- PascalCase for all interfaces and types: `BidResult`, `InteriorDetailedInputs`, `PricingSettings`, `LineItemConfig`
- Union types use `|`: `CalculatorType = 'interior-sqft' | 'interior-detailed' | ...`
- Record types for dynamic maps: `Record<string, number>`, `Record<string, boolean>`
- Use `type` for unions and primitives, `interface` for objects with multiple properties

## Code Style

**Formatting:**
- No explicit prettier/format config file (uses defaults)
- Indentation: 2 spaces
- Semicolons: Required
- Quotes: Single quotes preferred (exceptions allowed for template literals)
- Line length: No hard limit observed; natural wrapping

**Linting:**
- ESLint v9 with TypeScript support via `typescript-eslint`
- Config: `eslint.config.js` (flat config)
- Rules applied:
  - `@eslint/js`: Recommended
  - `typescript-eslint/configs`: Recommended
  - `react-hooks/rules-of-hooks`: Enforced
  - `react-refresh`: Enforced (Vite refresh compatibility)
- TypeScript strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`

**Component Style:**
- Functional components with hooks (React 19)
- Props passed as typed objects via interfaces
- Example pattern from `Button.tsx`:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return <button className={clsx(...)} {...props}>{children}</button>;
}
```

## Import Organization

**Order:**
1. React and framework imports: `import { useState } from 'react'`
2. Third-party libraries: `import { useForm } from 'react-hook-form'`, `import clsx from 'clsx'`
3. Internal absolute imports from src: `import { Button } from '../common/Button'`
4. Type imports: `import type { BidResult } from '../../types/calculator.types'`

**Path Aliases:**
- No path aliases configured in `tsconfig.app.json`
- Uses relative imports throughout: `../../types/`, `../common/`, `./shared/`
- Module resolution: bundler (Vite)

**Barrel Files:**
- Not used consistently; components are imported directly from their files
- Example: Import from `Button.tsx` directly, not from a `components/index.ts`

## Error Handling

**Patterns:**
- Error Boundary class component for React tree errors: `ErrorBoundary.tsx` catches and logs with `console.error`
- Try-catch for async operations: Used in `authStore.ts` for Firebase operations
  ```typescript
  try {
    const role = await getUserRole(firebaseUser.uid, firebaseUser.email);
    // ...
  } catch {
    set({ user: null, loading: false, error: 'Failed to load user profile.' });
  }
  ```
- Error state in Zustand stores: `error: string | null` with `clearError()` method
- User-facing error messages stored in state: `useAuthStore((s) => s.error)`
- Form validation errors passed to Input component: `<Input error={error} />`

## Logging

**Framework:** console (native)

**Patterns:**
- Error logging in Error Boundary: `console.error('App error:', error, info)`
- Minimal logging in production code; no dedicated logging library
- Use console.error for runtime errors, console.log for debugging only
- No structured logging (timestamps, levels) implemented

## Comments

**When to Comment:**
- JSDoc comments on exported functions explaining parameters and return types
- Block comments (`/** ... */`) for complex calculator logic
- Inline comments explaining non-obvious branching or calculations
- NO comments on obvious code (e.g., `const x = 5; // set x to 5`)

**JSDoc/TSDoc:**
- Used consistently on all exported calculator functions
- Example from `interiorSquareFootage.ts`:
```typescript
/**
 * Calculate auto-measurements based on house square footage
 */
export function calculateInteriorSqftAutoMeasurements(
  houseSquareFootage: number,
  pricing: PricingSettings
): InteriorSqftAutoCalcs {
  // ...
}
```
- Includes parameters, return type, and brief description
- Does NOT document obvious props on React components

## Function Design

**Size:**
- Small functions (under 50 lines) preferred
- Larger calculators up to 100+ lines acceptable when logically cohesive
- `calculateInteriorDetailed()` is ~120 lines but handles one complete workflow

**Parameters:**
- Use object parameters for functions with 3+ arguments
- Example: `calculateInteriorSquareFootage(inputs: InteriorSqftInputs & {...}, pricing: PricingSettings)`
- Calculator functions always accept `pricing: PricingSettings` as second parameter (required for dynamic rates)
- Optional parameters marked with `?`: `jobDate?: Date`, `notes?: string`

**Return Values:**
- Always return typed objects, not tuples
- Example from calculator: Returns `BidResult` with `{ labor, materials, profit, total, breakdown, timestamp }`
- Use discriminated unions for different return types
- Never return `void` except React hooks and event handlers

## Module Design

**Exports:**
- Named exports preferred over default exports
- Exception: React components in pages can be default-exported: `export default Home`
- Each file exports one primary unit (one calculator function, one component, one store)
- Barrel files not used; import directly from source

**Composition:**
- Calculator functions use helper utilities: `applyInteriorModifiers`, `calculateInteriorMaterials`
- Helper utilities in `utils/` subdirectories: `calculators/utils/modifierApplications.ts`
- Constants organized by domain: `constants/pricing.ts`, `constants/coverage.ts`, `constants/modifiers.ts`
- Zustand stores use single-responsibility: `authStore`, `settingsStore`, `bidStore`

## Special Patterns

**Zustand Store Structure:**
- Define interface with all state and methods: `interface SettingsState { settings, updateSettings(), addLineItem() }`
- Use `set()` callbacks with spread operators for immutable updates
- Persist middleware with storage key: `name: 'painting-company-settings'`
- Migrations via `onRehydrateStorage` hook for localStorage backward compatibility
- Example from `settingsStore.ts`:
```typescript
updatePricing: (updates) =>
  set((state) => ({
    settings: {
      ...state.settings,
      pricing: { ...state.settings.pricing, ...updates }
    }
  }))
```

**React Hook Form Integration:**
- Register form fields: `{...register('fieldName')}`
- Modifiers tracked as nested objects: `register('modifiers.heavilyFurnished')`
- Custom sections tracked as key-value records: `customItemValues?: Record<string, number>`

**Dynamic Pricing Migration:**
- Old fixed modifier values (`interiorModifierValues`) migrate to arrays (`interiorModifiers[]`)
- Migration functions in `settingsStore.ts`: `ensureNewPricingFields()`, `ensureDefaultSections()`
- Bids from old format migrated in `bidMigration.ts` when loaded
- Always maintain backward compatibility; never break existing saved data

---

*Convention analysis: 2026-03-04*
