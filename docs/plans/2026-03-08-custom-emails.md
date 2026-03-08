# Custom Email System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Brand the Supabase confirmation email and add a Resend-powered invite email edge function so team invites actually reach recipients.

**Architecture:** The welcome email is a Supabase Dashboard template update (no code). The invite email is a new `send-invite` edge function that calls Resend's API. Both `teamService.sendInvite()` and `Onboarding.handleFinish()` are updated to call the edge function after inserting the invite record. A shared HTML email template function provides consistent CoatCalc branding (navy/teal/gold/cream).

**Tech Stack:** Supabase Edge Functions (Deno), Resend API, inline HTML email templates

---

### Task 1: Create the branded HTML email template utility

**Files:**
- Create: `supabase/functions/_shared/emailTemplate.ts`

**Step 1: Create the shared email template function**

This is a Deno module that returns branded HTML for any email. It will be imported by the edge function.

```typescript
export function brandedEmail({
  preheader,
  heading,
  body,
  ctaText,
  ctaUrl,
}: {
  preheader: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #FDF8F0; font-family: 'DM Sans', Arial, sans-serif; }
    .preheader { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;">
  <span class="preheader">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF8F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0F2B3C;padding:24px 32px;text-align:center;">
              <img src="https://www.coatcalc.com/coatcalc-logo-final.png" alt="CoatCalc" height="40" style="height:40px;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-family:'DM Sans',Arial,sans-serif;font-size:22px;font-weight:700;color:#0F2B3C;">
                ${heading}
              </h1>
              <p style="margin:0 0 24px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;line-height:1.6;color:#4b5563;">
                ${body}
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}"
                       style="display:inline-block;background-color:#0D9488;color:#ffffff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;text-decoration:none;padding:12px 32px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#9ca3af;">
                CoatCalc — Professional Painting Estimates
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

**Step 2: Commit**

```bash
git add supabase/functions/_shared/emailTemplate.ts
git commit -m "feat: add branded HTML email template utility"
```

---

### Task 2: Create the send-invite edge function

**Files:**
- Create: `supabase/functions/send-invite/index.ts`

**Step 1: Create the edge function**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { brandedEmail } from '../_shared/emailTemplate.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.coatcalc.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const { email, token, orgName, role } = await req.json();
    if (!email || !token || !orgName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inviteUrl = `https://www.coatcalc.com/invite/${token}`;
    const roleLabel = role === 'admin' ? 'an Admin' : 'an Estimator';

    const html = brandedEmail({
      preheader: `${orgName} has invited you to join their team on CoatCalc`,
      heading: `You've been invited to join ${orgName} on CoatCalc`,
      body: `${orgName} has invited you to collaborate on their painting estimates as ${roleLabel}. Click below to accept the invitation and get started.`,
      ctaText: 'Accept Invite',
      ctaUrl: inviteUrl,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'CoatCalc <noreply@coatcalc.com>',
        to: [email],
        subject: `You've been invited to join ${orgName} on CoatCalc`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Resend error: ${err}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/send-invite/index.ts
git commit -m "feat: add send-invite edge function with Resend"
```

---

### Task 3: Update teamService.sendInvite to send the email

**Files:**
- Modify: `src/services/teamService.ts:69-75`

**Step 1: Update sendInvite to return the token and call the edge function**

The current `sendInvite` only inserts into the DB. Update it to:
1. Insert the invitation and return the generated token
2. Call the `send-invite` edge function with the token, email, org name, and role

```typescript
export async function sendInvite(
  orgId: string,
  email: string,
  role: InvitationRole,
  orgName: string
): Promise<void> {
  const { data, error } = await supabase
    .from('invitations')
    .insert({ organization_id: orgId, email, role })
    .select('token')
    .single();

  if (error) throw error;

  // Send invite email (fire-and-forget, don't block on email failure)
  supabase.functions.invoke('send-invite', {
    body: { email, token: data.token, orgName, role },
  }).catch(console.error);
}
```

**Step 2: Commit**

```bash
git add src/services/teamService.ts
git commit -m "feat: send invite email after creating invitation"
```

---

### Task 4: Update TeamSettings to pass org name to sendInvite

**Files:**
- Modify: `src/components/settings/TeamSettings.tsx:35`

**Step 1: Update the handleInvite call**

Change line 35 from:
```typescript
await sendInvite(org.id, email.trim(), inviteRole);
```
to:
```typescript
await sendInvite(org.id, email.trim(), inviteRole, org.name);
```

**Step 2: Commit**

```bash
git add src/components/settings/TeamSettings.tsx
git commit -m "feat: pass org name to sendInvite in TeamSettings"
```

---

### Task 5: Update Onboarding to send invite emails

**Files:**
- Modify: `src/pages/Onboarding.tsx:126-133`

**Step 1: Update handleFinish to call sendInvite with org name and get the token back**

Replace the invite loop (lines 128-133) with:

```typescript
const { sendInvite } = await import('../services/teamService');
for (const invite of invites) {
  try {
    await sendInvite(orgId, invite.email, invite.role, form.companyName.trim());
  } catch (err) {
    console.error('[onboarding] invite error:', (err as Error).message);
  }
}
```

Note: We use `sendInvite` from teamService instead of raw supabase insert so the email gets sent too.

**Step 2: Commit**

```bash
git add src/pages/Onboarding.tsx
git commit -m "feat: send invite emails during onboarding"
```

---

### Task 6: Deploy edge function and set Resend API key

**Step 1: Set the RESEND_API_KEY secret on Supabase**

The user needs to:
1. Create a Resend account at https://resend.com
2. Add and verify the `coatcalc.com` domain
3. Create an API key
4. Set it as a Supabase secret:

```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 supabase secrets set RESEND_API_KEY=re_xxxxx
```

**Step 2: Deploy the edge function**

```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 supabase functions deploy send-invite --no-verify-jwt
```

**Step 3: Verify deployment**

Test by inviting a team member from Settings or Onboarding and confirming the email arrives.

---

### Task 7: Update Supabase confirmation email template

**Step 1: Update the template in Supabase Dashboard**

Go to Supabase Dashboard → Authentication → Email Templates → "Confirm signup"

Replace the default template with this branded HTML (uses the same visual style as the invite email):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirm your email</title>
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF8F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e5e7eb;">
          <tr>
            <td style="background-color:#0F2B3C;padding:24px 32px;text-align:center;">
              <img src="https://www.coatcalc.com/coatcalc-logo-final.png" alt="CoatCalc" height="40" style="height:40px;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-family:'DM Sans',Arial,sans-serif;font-size:22px;font-weight:700;color:#0F2B3C;">
                Welcome to CoatCalc
              </h1>
              <p style="margin:0 0 24px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;line-height:1.6;color:#4b5563;">
                Confirm your email to get started with professional painting estimates.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}"
                       style="display:inline-block;background-color:#0D9488;color:#ffffff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;text-decoration:none;padding:12px 32px;">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#9ca3af;">
                CoatCalc — Professional Painting Estimates
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

Set the subject to: `Welcome to CoatCalc — Confirm your email`

**Step 2: Commit the plan doc and push**

```bash
git add docs/plans/2026-03-08-custom-emails.md docs/plans/2026-03-08-custom-emails-design.md
git commit -m "docs: add custom email system design and implementation plan"
git push
```

---

## Pre-requisites (user action required before Task 6)

1. **Create Resend account** at https://resend.com
2. **Add and verify `coatcalc.com` domain** in Resend (requires DNS records)
3. **Create Resend API key**

Without domain verification, Resend will only send from `onboarding@resend.dev` which looks unprofessional. Domain verification is required to send from `noreply@coatcalc.com`.
