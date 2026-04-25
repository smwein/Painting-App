# Launch Tracking — Partner Mastermind

## Partner's link (clean version)

Send your partner this URL for his mastermind post + Loom videos:

```
https://www.coatcalc.com/painters
```

Looks like a "for painters" landing page. Behind the scenes it tags the visitor with `source=mastermind, medium=loom, campaign=partner-launch` and redirects to the homepage. Nothing in the URL hints at attribution — your partner doesn't look like an affiliate, just a guy sharing a tool he uses.

The raw UTM URL still works too if you want it:
```
https://www.coatcalc.com/?utm_source=mastermind&utm_medium=loom&utm_campaign=partner-launch
```

### Adding more channels

For new channels, you've got two options:

**Quick (UTM URL):** drop in different params.

| Channel | URL |
|---|---|
| Facebook group post | `?utm_source=facebook&utm_medium=group&utm_campaign=<group-name>` |
| Direct email | `?utm_source=email&utm_medium=outreach&utm_campaign=<batch-name>` |
| Reddit | `?utm_source=reddit&utm_medium=post&utm_campaign=<sub>` |

**Clean (vanity path):** add a new route in `src/App.tsx` + a redirect component like `PaintersLanding.tsx`. Worth it if the channel's going to be high-volume or shared publicly (e.g. business cards, podcast mentions).

## How it works

1. Visitor lands on coatcalc.com with UTM params → `src/utils/attribution.ts` captures them to localStorage (first-touch only — never overwritten).
2. They sign up for a free trial.
3. When onboarding completes, `Onboarding.tsx` reads attribution from localStorage and passes it to the `create_organization_for_user` RPC.
4. The org row in Supabase is stamped with `signup_source`, `signup_medium`, `signup_campaign`, `signup_referrer`.

## Apply the migration (one-time)

The app code is wired up, but the DB columns + RPC update need to land in Supabase before this works:

```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 \
  supabase db push --project-ref hbranokmkritcdzozjli
```

Or paste the contents of `supabase/migrations/009_signup_attribution.sql` into the Supabase SQL editor.

Until the migration runs, signups will fail with an RPC signature error — apply this BEFORE the partner posts.

## Check signups by channel

Run in Supabase SQL editor:

```sql
SELECT
  COALESCE(signup_source, '(direct)') AS source,
  COALESCE(signup_campaign, '—')      AS campaign,
  COUNT(*)                            AS signups,
  COUNT(*) FILTER (WHERE plan_status IN ('active', 'trialing')) AS active_or_trialing,
  COUNT(*) FILTER (WHERE plan_status = 'active')                AS paid
FROM organizations
WHERE created_at >= now() - interval '90 days'
GROUP BY 1, 2
ORDER BY signups DESC;
```

For the mastermind specifically:

```sql
SELECT id, name, plan_status, trial_ends_at, created_at
FROM organizations
WHERE signup_source = 'mastermind'
ORDER BY created_at DESC;
```

## Caveats

- Localhost / private browsing visitors with no localStorage will be recorded as direct.
- If a visitor clicks the partner link, then comes back days later via a Google search, they'll still be tagged `mastermind` (first-touch). That's the right call — credit goes to the discovery channel.
- If the same person signs up for two orgs, both get the same attribution. Fine for our scale.
