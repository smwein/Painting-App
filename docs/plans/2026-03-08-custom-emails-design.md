# Custom Email System Design

## 1. Welcome/Confirmation Email (Supabase Template)
- Customize Supabase's built-in "Confirm signup" email template in Dashboard
- CoatCalc branding: navy header with logo, teal confirm button, cream background
- Copy: "Welcome to CoatCalc — confirm your email to get started"
- No code changes — HTML template update in Supabase Dashboard → Authentication → Email Templates

## 2. Team Invite Email (Edge Function + Resend)
- New edge function `send-invite` — receives org name, invite email, token, role
- Resend for delivery (free tier = 100 emails/day)
- Branded HTML template matching welcome email style
- Hook into existing flow: after `sendInvite()` creates DB record, call edge function
- Invite link format: `https://www.coatcalc.com/invite/{token}`
- Copy: "You've been invited to join [Company Name] on CoatCalc"

## Changes Required
| File | Change |
|------|--------|
| Supabase Dashboard | Update confirmation email HTML template |
| `supabase/functions/send-invite/index.ts` | New edge function using Resend API |
| `src/services/teamService.ts` | Call send-invite after creating DB record |
| Supabase env vars | Add `RESEND_API_KEY` |

## Unchanged
- Signup flow, onboarding flow, AcceptInvite page
- Invite token/expiry logic
