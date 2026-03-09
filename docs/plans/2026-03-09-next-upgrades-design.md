# Next Upgrades Design — Bid Duplication, Search/Filter, Notes, Onboarding Logo, Estimator Isolation

## 1. Bid Duplication
- "Clone" button on each bid card in the saved bids list
- Clones all measurements/inputs but clears customer name and info
- Opens the cloned bid in the appropriate calculator, ready to edit
- Does NOT auto-save — user saves when ready

## 2. Search & Filter on Saved Bids
- Search bar at top of Saved Bids page — filters by customer name (case-insensitive, instant)
- Calculator type dropdown filter (All, Interior Quick, Interior Detailed, Exterior Quick, Exterior Detailed, Per Room)
- Both filters work together (AND logic)
- Show result count (e.g., "Showing 3 of 12 bids")

## 3. Customer Notes
- New `notes` text field in bid data (optional, stored in `bid_data` JSONB — no DB migration)
- Textarea in each calculator form near customer info
- Notes preview on saved bids list — truncated to ~80 chars, shown below customer name
- Editable from both places

## 4. Logo Upload in Onboarding
- Add logo upload field to Step 1 of onboarding (below company name)
- Reuse existing logo upload component from Settings (base64, max 2MB)
- Logo saved to org settings along with other company info

## 5. Estimator Bid Isolation
- Bids get a `created_by` field (user ID) stored in `bid_data` JSONB
- When loading bids: if user role is `estimator`, filter to only their bids
- Owners and admins see all bids
- New bids automatically stamp `created_by` with current user ID
