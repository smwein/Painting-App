# Testing Patterns

**Analysis Date:** 2026-03-04

## Test Framework

**Runner:**
- Vitest v4.0.18
- Config: Not explicitly created; uses Vitest defaults via `vite.config.ts`
- Package installed in devDependencies but no `vitest.config.ts` or test configuration file present

**Assertion Library:**
- None configured explicitly; Vitest provides built-in assertions or would use a standard library if tests existed

**Run Commands:**
```bash
npm run dev              # Start dev server (Vite)
npm run build           # Build for production with type checking
npm lint                # Run ESLint
# No test command defined in package.json
```

## Test File Organization

**Current Status:**
- **NO test files exist in the codebase** (`/src/**/*.test.ts`, `*.spec.ts`)
- Testing infrastructure installed (vitest, @testing-library/react) but not yet utilized
- 64 source files in `/src/` with zero test coverage

**Recommended Location (if tests were to be added):**
- Co-located pattern: `src/components/Button.tsx` paired with `src/components/Button.test.tsx`
- Utilities: `src/utils/formatters.ts` paired with `src/utils/formatters.test.ts`
- Core calculators: `src/core/calculators/interiorDetailed.ts` paired with `src/core/calculators/interiorDetailed.test.ts`
- Store tests: `src/store/settingsStore.test.ts` for Zustand store logic

**Naming:**
- File suffix: `.test.ts` or `.test.tsx` (conventional for Vitest)
- Test function names: `it('should...', () => {})` or `test('should...', () => {})`

## Dependencies Available for Testing

**Testing Libraries:**
- `@testing-library/react` v16.3.2 - React component testing utilities
- `@testing-library/user-event` v14.6.1 - User interaction simulation
- `vitest` v4.0.18 - Test runner and framework

**NOT installed:**
- No mocking library (jest, vi, sinon) explicitly listed; Vitest provides these via `vi` namespace
- No snapshot testing library
- No E2E framework (Playwright, Cypress)

## Suggested Test Structure

If tests were to be implemented, following conventions would be:

```typescript
// Test suite for calculator functions
describe('calculateInteriorSquareFootage', () => {
  it('should calculate base cost without modifiers', () => {
    const inputs: InteriorSqftInputs = {
      houseSquareFootage: 2000,
      pricingOptions: ['complete'],
      markup: 40,
      houseCondition: 'furnished',
    };
    const pricing = createDefaultPricingSettings();

    const result = calculateInteriorSquareFootage(inputs, pricing);

    expect(result.total).toBeGreaterThan(result.labor + result.materials.totalCost);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should apply simple modifiers respecting scope', () => {
    const inputs: InteriorSqftInputs & { simpleModifiers: Record<string, boolean> } = {
      houseSquareFootage: 1000,
      pricingOptions: ['walls-only'],
      markup: 50,
      houseCondition: 'furnished',
      simpleModifiers: { 'simple-mod-second-dry-coat': true },
    };
    const pricing = createDefaultPricingSettings();

    const result = calculateInteriorSquareFootage(inputs, pricing);

    expect(result.labor).toBeDefined();
    expect(result.materials.totalCost).toBeDefined();
  });
});
```

```typescript
// Test suite for Zustand store
describe('useSettingsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useSettingsStore.setState(useSettingsStore.getState());
  });

  it('should update pricing settings', () => {
    const store = useSettingsStore.getState();
    const newRate = 2.5;

    store.updatePricing({
      interiorSqft: { ...store.settings.pricing.interiorSqft, wallsOnly: newRate },
    });

    const updated = useSettingsStore.getState();
    expect(updated.settings.pricing.interiorSqft.wallsOnly).toBe(newRate);
  });

  it('should add line item with generated ID and order', () => {
    const store = useSettingsStore.getState();
    const initialCount = store.settings.pricing.lineItems.length;

    store.addLineItem({ name: 'Custom Item', rate: 100, unit: 'sqft', category: 'misc', isDefault: false });

    const updated = useSettingsStore.getState();
    expect(updated.settings.pricing.lineItems.length).toBe(initialCount + 1);
    expect(updated.settings.pricing.lineItems[initialCount].id).toMatch(/^custom-/);
  });
});
```

```typescript
// Test suite for React components
describe('Button Component', () => {
  it('should render with primary variant by default', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole('button');

    expect(button).toHaveClass('bg-primary-600');
  });

  it('should call onClick handler', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = render(<Button onClick={handleClick}>Click</Button>);

    await user.click(getByRole('button'));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should support all size variants', () => {
    const { rerender, getByRole } = render(<Button size="sm">Small</Button>);
    expect(getByRole('button')).toHaveClass('px-3');

    rerender(<Button size="lg">Large</Button>);
    expect(getByRole('button')).toHaveClass('px-6');
  });
});
```

## Patterns NOT Currently Used

**Async Testing:**
- Calculator functions are synchronous; no async testing patterns implemented
- Firebase operations in `authStore` are async but not tested
- Would use: `await waitFor(() => expect(...))` via testing-library
- Or: `vi.waitFor()` for async state updates

**Mocking:**
- No Firebase mocks exist; would need `vi.mock('firebase/auth')` for auth tests
- Would mock Zustand stores with `vi.spyOn()` for store mutation tests
- Component mocks: `vi.mock('../common/Button', () => ({ Button: () => <div>Button</div> }))`

**Error Testing:**
- Error Boundary has no tests; would test with `expect(() => render(ErrorComponent)).toThrow()`
- Form validation errors not tested; would use user-event to trigger invalid inputs

## Coverage & Recommendations

**Current:**
- 0% coverage across all files
- No CI pipeline configured for test runs
- Build step ignores test failures: `npm run build` only runs `tsc -b && vite build`

**To Enable Testing:**
1. Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

2. Add test script to `package.json`:
```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest --coverage"
```

3. Start with high-value tests:
   - Calculator functions (complex business logic): `src/core/calculators/*.test.ts`
   - Store mutations: `src/store/*.test.ts`
   - Utility functions: `src/utils/*.test.ts`

4. Optional: Add React component tests once UI becomes more complex:
   - Focus on form handling: `InteriorDetailed.test.tsx`
   - Focus on conditional rendering: Tests for calculator variants
   - Accessibility: Button, Input, Card components

## Notes on Testing Strategy

- **Calculator functions are pure and deterministic** — ideal for unit tests with multiple inputs/outputs
- **Zustand stores use immutable patterns** — straightforward to test state mutations
- **React components are mostly presentational** — lower priority for testing; focus on validation and form integration
- **Firebase auth integration is critical** — should mock and test auth flows thoroughly
- **No E2E tests** — consider Playwright for full workflow testing (login → calculate → export PDF)

---

*Testing analysis: 2026-03-04*
