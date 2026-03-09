# Next Upgrades Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add bid duplication, search/filter on saved bids, customer notes in bid list, logo upload in onboarding, and estimator bid isolation.

**Architecture:** All changes are frontend-only. Notes already exist in `CustomerInfo` type and `CustomerInfoSection` component — just need to surface them in the bid list. Bid duplication clones bid data and navigates to the calculator. Search/filter is client-side filtering on the existing bid list. Logo upload reuses the existing base64 pattern from `CompanyInfoSettings`. Estimator isolation adds a `created_by` field to `Bid` type and filters in `getAllBids()`.

**Tech Stack:** React, TypeScript, Zustand, React Router, Tailwind CSS

---

### Task 1: Add `created_by` to Bid type and stamp on save

**Files:**
- Modify: `src/types/bid.types.ts`
- Modify: `src/store/bidStore.ts`

**Step 1: Add `created_by` to Bid interface**

In `src/types/bid.types.ts`, add `created_by?: string` to the `Bid` interface (optional for backwards compat with existing bids):

```ts
export interface Bid {
  id: string;
  calculatorType: CalculatorType;
  customer: CustomerInfo;
  inputs: CalculatorInputs;
  result: BidResult;
  createdAt: Date;
  updatedAt: Date;
  created_by?: string;
}
```

**Step 2: Stamp `created_by` on bid save**

In `src/store/bidStore.ts`, in the `saveBid` method, add `created_by` from the store's `_userId`:

```ts
saveBid: (bidData) => {
  const { _userId } = get();
  const newBid: Bid = {
    ...bidData,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    created_by: _userId || undefined,
  };
  // ... rest unchanged
```

**Step 3: Commit**

```bash
git add src/types/bid.types.ts src/store/bidStore.ts
git commit -m "feat: stamp created_by user ID on new bids"
```

---

### Task 2: Estimator bid isolation in getAllBids

**Files:**
- Modify: `src/store/bidStore.ts`
- Modify: `src/types/bid.types.ts` (add `notes` to `BidListItem`)

**Step 1: Add `notes` and `created_by` to BidListItem**

In `src/types/bid.types.ts`, update `BidListItem`:

```ts
export interface BidListItem {
  id: string;
  customerName: string;
  total: number;
  createdAt: Date;
  calculatorType: CalculatorType;
  notes?: string;
  created_by?: string;
}
```

**Step 2: Update getAllBids to include notes and support role filtering**

In `src/store/bidStore.ts`, update `getAllBids` to accept an optional `role` parameter and include notes:

Change the interface:
```ts
getAllBids: (role?: string) => BidListItem[];
```

Update the implementation:
```ts
getAllBids: (role?: string) => {
  const { bids, _userId } = get();

  // Estimators only see their own bids
  const filteredBids = (role === 'estimator' && _userId)
    ? bids.filter((bid) => bid.created_by === _userId)
    : bids;

  return filteredBids
    .map((bid): BidListItem => ({
      id: bid.id,
      customerName: bid.customer.name,
      total: bid.result.total,
      createdAt: bid.createdAt,
      calculatorType: bid.calculatorType,
      notes: bid.customer.notes,
      created_by: bid.created_by,
    }))
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
},
```

**Step 3: Commit**

```bash
git add src/types/bid.types.ts src/store/bidStore.ts
git commit -m "feat: estimator bid isolation and notes in bid list items"
```

---

### Task 3: Revamp SavedBids page with search, filter, clone, and notes

**Files:**
- Modify: `src/pages/SavedBids.tsx`

**Step 1: Rewrite SavedBids with all new features**

Full replacement of `src/pages/SavedBids.tsx`. Key changes:
- Import `useAuthStore` to get user role, pass to `getAllBids(role)`
- Add search state (`searchQuery`) — filters by customer name (case-insensitive)
- Add calculator type filter state (`typeFilter`) — dropdown with "All" + 5 types
- Show result count: "Showing X of Y bids"
- Add Clone button on each bid card (next to Delete)
- Show notes preview (truncated ~80 chars) below customer name on each card
- Clone handler: calls `loadBid(id)`, clears customer name/address/phone/email, navigates to `/app/calculator/${bid.calculatorType}` with `{ state: { loadedBid: clonedBid } }`
- Fix existing bug: navigate path should be `/app/calculator/...` not `/calculator/...`

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidStore } from '../store/bidStore';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { format } from 'date-fns';

const CALCULATOR_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'interior-sqft', label: 'Interior SF' },
  { value: 'interior-detailed', label: 'Interior Detailed' },
  { value: 'exterior-sqft', label: 'Exterior SF' },
  { value: 'exterior-detailed', label: 'Exterior Detailed' },
  { value: 'per-room', label: 'Per Room' },
];

export function SavedBids() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getAllBids, deleteBid, loadBid } = useBidStore();
  const allBids = getAllBids(user?.role);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filteredBids = allBids.filter((bid) => {
    const matchesSearch = !searchQuery || bid.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || bid.calculatorType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = (e: React.MouseEvent, id: string, customerName: string) => {
    e.stopPropagation();
    if (confirm(`Delete bid for ${customerName}?`)) {
      deleteBid(id);
    }
  };

  const handleView = (id: string) => {
    const bid = loadBid(id);
    if (bid) {
      navigate(`/app/calculator/${bid.calculatorType}`, {
        state: { loadedBid: bid },
      });
    }
  };

  const handleClone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const bid = loadBid(id);
    if (bid) {
      const clonedBid = {
        ...bid,
        id: crypto.randomUUID(),
        customer: { ...bid.customer, name: '', address: '', phone: '', email: '' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      navigate(`/app/calculator/${bid.calculatorType}`, {
        state: { loadedBid: clonedBid },
      });
    }
  };

  const getCalculatorLabel = (type: string) => {
    const option = CALCULATOR_OPTIONS.find((o) => o.value === type);
    return option?.label || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-800 uppercase tracking-wide text-navy mb-2">Saved Bids</h2>
        <p className="text-gray-600">
          {allBids.length === 0
            ? 'No saved bids yet. Create a bid to get started.'
            : `${filteredBids.length === allBids.length ? allBids.length : `Showing ${filteredBids.length} of ${allBids.length}`} saved ${allBids.length === 1 ? 'bid' : 'bids'}`}
        </p>
      </div>

      {allBids.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body"
          >
            {CALCULATOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {allBids.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-6">You haven't saved any bids yet.</p>
            <Button onClick={() => navigate('/app')} variant="primary">
              Create Your First Bid
            </Button>
          </CardContent>
        </Card>
      ) : filteredBids.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-gray-500">No bids match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBids.map((bid) => (
            <div key={bid.id} onClick={() => handleView(bid.id)} className="cursor-pointer">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {bid.customerName}
                      </h3>
                      {bid.notes && (
                        <p className="text-sm text-gray-400 mt-0.5 truncate">
                          {bid.notes.length > 80 ? bid.notes.slice(0, 80) + '...' : bid.notes}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-teal-50 text-teal-700">
                          {getCalculatorLabel(bid.calculatorType)}
                        </span>
                        <span>
                          {format(new Date(bid.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-display font-800 text-navy">
                        ${bid.total.toFixed(2)}
                      </div>
                      <div className="mt-2 flex items-center gap-3 justify-end">
                        <button
                          onClick={(e) => handleClone(e, bid.id)}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Clone
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, bid.id, bid.customerName)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/SavedBids.tsx
git commit -m "feat: add search, filter, clone, and notes preview to saved bids"
```

---

### Task 4: Add logo upload to onboarding Step 1

**Files:**
- Modify: `src/pages/Onboarding.tsx`

**Step 1: Add logo upload to onboarding**

Add logo state and file upload handler (reuse pattern from `CompanyInfoSettings.tsx`). Add a logo upload section below company name in the Step 1 form. Save the logo as part of the pricing settings when calling the RPC.

Key changes:
- Add `logo` to the `form` state (as `string | undefined`)
- Add `fileInputRef` with `useRef<HTMLInputElement>(null)`
- Add `handleLogoUpload` function (validate max 2MB, image type, convert to base64)
- Add `handleRemoveLogo` function
- Include `logo` in `pricingWithCompanyInfo` object passed to the RPC
- Add logo upload UI between company name field and address field:
  - If logo exists: show preview image + "Remove" button
  - If no logo: show "Upload Logo" button + hidden file input
  - Helper text: "Optional — appears on PDF bid exports. Max 2MB."

```tsx
// Add to imports:
import { useState, useEffect, useRef } from 'react';

// Add to state:
const fileInputRef = useRef<HTMLInputElement>(null);
const [logo, setLogo] = useState<string | undefined>(undefined);

// Add handlers:
const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file size must be less than 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }
};

// In handleCompanySubmit, include logo:
const pricingWithCompanyInfo = {
  ...defaultPricing,
  name: form.companyName.trim(),
  address: form.address.trim(),
  phone: form.phone.trim(),
  email: form.email.trim(),
  website: form.website.trim(),
  licenseNumber: form.licenseNumber.trim(),
  logo,
};
```

Logo upload UI (add after Company Name field, before Address):
```tsx
{/* Logo upload */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Company Logo
  </label>
  {logo ? (
    <div className="space-y-2">
      <div className="p-3 bg-gray-50 flex items-center justify-center">
        <img src={logo} alt="Logo" className="max-h-20 max-w-full object-contain" />
      </div>
      <button
        type="button"
        onClick={() => setLogo(undefined)}
        className="text-sm text-red-500 hover:text-red-700"
      >
        Remove
      </button>
    </div>
  ) : (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full px-3 py-2 border border-dashed border-gray-300 text-sm text-gray-500 hover:border-teal-500 hover:text-teal-600 transition-colors"
      >
        + Upload Logo
      </button>
    </div>
  )}
  <p className="text-xs text-gray-400 mt-1">Optional — appears on PDF bid exports. Max 2MB.</p>
</div>
```

**Step 2: Commit**

```bash
git add src/pages/Onboarding.tsx
git commit -m "feat: add logo upload to onboarding step 1"
```

---

### Task 5: Build, test, and push

**Step 1: Run build**

Run: `npm run build`
Expected: Clean build, no TypeScript errors

**Step 2: Push**

```bash
git push origin main
```
