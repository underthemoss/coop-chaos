# Account service and saved copies

Guest play and device saves do not need an account. Account copies are explicit,
named, immutable snapshots. Login never uploads, merges or replaces a device
game. Loading a copy returns validated game data; the front door decides where
to store it locally. There is no automatic cloud synchronization.

## Browser configuration

Copy `.env.example` to a local ignored `.env.local` and supply the dedicated
project's HTTPS URL and **publishable** `sb_publishable_…` key. Never put a secret,
`service_role`, management token, password or SMTP credential into a Vite variable.
Set `VITE_ACCOUNT_EMAIL_READY=true` only after the real sender and eight-digit
code templates are configured and tested. It is a public deployment readiness
flag, not an authorization control. URL/key alone do not enable accounts.
Missing/invalid configuration or a readiness flag other than exact `true` renders
an unavailable message and a guest route; it does not submit auth requests.
The managed SDK stores and refreshes its own
session. The app does not implement a second token store. Sign out affects this
browser's session; it does not delete device games or account copies.

The dedicated project selected on 2026-10-24 is `ptrbffkygdshhainmjml` in
underthemoss's Org, URL `https://ptrbffkygdshhainmjml.supabase.co`. No unrelated
project is used. Pin `@supabase/supabase-js` to 2.108.0: newer 2.118.0 requires
Node 22 while this repository also supports Node 20. Commit the lockfile.

## Email OTP setup — provider qualified, public enablement pending

Use Supabase Email authentication and eight-digit email OTP, with the Magic Link
email template containing `{{ .Token }}` instead of a link. Check both signup
confirmation and returning-login emails. Set an appropriate short OTP expiry and
provider rate limits, and configure the actual deployed Site URL. The dedicated
project currently uses a 3,600-second expiry. Client attempts
have a 60-second resend cooldown; provider rate limits remain authoritative.
Login uses `shouldCreateUser:false`; Create account uses `true`. Verification
uses `verifyOtp({email,token,type:'email'})` in the original tab. Request success
does not prove inbox delivery or sign-in; only an actual returned session does.

The user owns `chickenciv.com` at GoDaddy. Resend verified
`auth.chickenciv.com` through GoDaddy Auto Configure on 2026-10-24. The dedicated
project now uses custom SMTP at `smtp.resend.com:465`, username `resend`, with
From address `Coop Chaos <login@auth.chickenciv.com>`. The domain-restricted
sending key was entered privately by the user; never put it in this repository
or a Vite variable. Both signup and returning-login templates are saved with
subject `Your Coop Chaos sign-in code`, the `{{ .Token }}` code, and the agreed
plain sign-in copy. Site URL is `https://coop-chaos.vercel.app`, with no wildcard
redirects. Email OTP length remains the provider's eight digits; expiry remains
3,600 seconds. The client uses the same eight-digit requirement.

The user's supplied Yahoo mailbox is authorized for qualification. The first
signup email was delivered by Resend and found in Yahoo Spam; later signup
requests reached Inbox, while the returning-login email reached Spam. Actual
eight-digit signup and returning login, session reload, sign-out, explicit copy
save/readback and load-as-new-local/reopen passed against this provider from an
isolated local app on 2026-10-24. The selected signup email exposed Yahoo
`dkim=pass` for `auth.chickenciv.com`; SPF/DMARC were not independently confirmed.
Delivery is not a promise of inbox placement. Keep public
`VITE_ACCOUNT_EMAIL_READY=false` until the readiness decision is accepted; a
local qualification server may enable it only
for the isolated test origin. Supabase's default SMTP is not public-email
acceptance. New Free projects using default SMTP cannot customize auth templates
after 2026-06-03; custom SMTP (or an appropriate plan) is needed for this code
template. Do not work around missing auth configuration with direct auth-table
writes or privileged browser credentials.

Current CLI availability: no installed `supabase` executable was found. The
connected project tools expose tables/SQL/advisors and public keys, but no Auth
configuration method. Auth settings above were configured in the dedicated
project dashboard; actual mailbox/session/copy qualification and the public
readiness decision remain separate. No management credential was searched for
or displayed.

References checked on 2026-10-24:

- [Email OTP and templates](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Auth state events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Verified current user](https://supabase.com/docs/reference/javascript/auth-getuser)
- [RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Free email template restriction](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)

## Integration contract

- `AccountPanel` from `src/account/AccountPanel.tsx`: `{mode:'login'|'signup',
  onClose, onSessionChange?}`. It presents pending, code verification, resend,
  recovery, service-unavailable and signed-in/sign-out states.
- `useAccountSession()` returns `{status,session,error,refresh}`; status is
  `unavailable|loading|signed-out|signed-in|error`. Session is presentation state,
  never an authorization substitute. The hook subscribes before hydration and
  discards hydration results superseded by auth events or unmounting.
- `accountService.copies.list(offset=0)` returns newest metadata pages of 50;
  `.get(id)` returns `{id,name,createdAt,text,state}` after strict decoding and
  canonical encoding; `.create(name,text,copyId,expectedOwner)` validates before writing and
  returns metadata. Every operation verifies the user through Auth, scopes the
  query to that owner, and rejects results if the local session owner changed.
  Creation also rejects an owner differing from the initiating UI intent before
  any INSERT, including an account switch while Auth verification is pending.
- Generate one UUID per explicit Save action. Retain the **same** ID, name and
  snapshot for Retry after ambiguous failure. Creation uses INSERT, never upsert;
  an existing matching row reconciles a lost reply. A mismatched ID cannot replace
  data. Once confirmed, a subsequent explicit save is a new copy/new ID.
- Clear listed copies and pending save intent on owner changes; discard stale UI
  callbacks. The adapter does not cache copies or touch local storage. It rejects
  SDK anonymous users as well as signed-out callers.
- Validate before upload and after read using the existing strict decoder. The
  262,144-byte UTF-8 limit matches the front door's import bound; migration must
  also fit after canonical encoding. Corrupt copies cannot replace a local game.

## Approved schema v1

This exact SQL is versioned here because no Supabase CLI is installed. It was
reviewed and applied on 2026-10-24 only to the dedicated project using the hosted
migration operation `account_save_copies_v1`; this is not authorization to apply
it to another project. The public schema was inspected and had no tables before setup.
Server rules enforce ownership, byte/name limits, server-created time and
immutability. Game-format readability is owned by the existing client decoder;
the database deliberately does not duplicate the game simulation validator.

```sql
create table public.account_save_copies (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  payload text not null check (octet_length(payload) between 1 and 262144),
  created_at timestamptz not null default now()
);
create index account_save_copies_owner_created_idx
  on public.account_save_copies (owner_id, created_at desc, id desc);
alter table public.account_save_copies enable row level security;
alter table public.account_save_copies force row level security;
revoke all on public.account_save_copies from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.account_save_copies to authenticated;
grant insert (id, owner_id, name, payload) on public.account_save_copies to authenticated;
create policy account_copies_select on public.account_save_copies
  for select to authenticated
  using ((select auth.uid()) = owner_id
    and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
create policy account_copies_insert on public.account_save_copies
  for insert to authenticated
  with check ((select auth.uid()) = owner_id
    and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
```

There are no update/delete grants or policies, privileged functions, triggers,
views, or public payload access. Authenticated users cannot supply `created_at`;
the database supplies it. UUID/name/payload cannot be modified after insertion.
Account deletion cascades its copies. This does not grant the app an account
deletion flow.

The hosted performance advisor requires the JSON extraction outside the scalar
subquery so it recognizes the per-statement Auth lookup. Migration
`account_save_copies_auth_initplan` applies this equivalent policy expression:

```sql
alter policy account_copies_select on public.account_save_copies
  using ((select auth.uid()) = owner_id
    and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
alter policy account_copies_insert on public.account_save_copies
  with check ((select auth.uid()) = owner_id
    and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
```

## Qualification and remaining hosted proof

Unit tests use a stubbed managed client, not fake production login. They cover
login/signup request flags, verification errors and missing sessions, sign-out
errors, subscription disposal, no-config behavior, changed users, bounded strict
save validation and duplicate/ambiguous insert recovery.

After both migrations, rollback-only isolated database fixtures passed on
2026-10-24 with synthetic A/B owners and JWT claims under the actual
`authenticated` role: each owner inserted/read its own copy, neither could read
the other's, and A read back the exact canonical opening save. Owner mismatch,
created-time spoof, oversized payload, untrimmed name, UPDATE and DELETE were
denied. `anon` and anonymous-auth users could not access copies. A duplicate copy
ID was rejected and the original remained the sole row. Server-created time
matched the transaction time. Rollback readback confirmed zero fixture copies
and zero fixture owners. These are database-role/RLS probes, not a real mailed
OTP, issued user JWT or authenticated Data API qualification.

Security advisors returned no findings. The policy performance warnings were
resolved by `account_save_copies_auth_initplan` and the complete probes passed
again. The only remaining performance advisory is informational: the project's
Auth connection allocation is a fixed maximum of 10 rather than a percentage;
review that setting before scaling the database instance.

The real mailbox journey retained one immutable `Yahoo account proof` account
copy (4,788 bytes, schema 8) and two separate same-named device slots at the
isolated qualification origin. Reload and returning login retained that copy.
One stale code was rejected after a newer request, and provider resend limiting
was surfaced; natural 3,600-second expiry was not waited out.

Still required before claiming the full public account journey: acceptance and
release of the eight-digit client fix, explicitly enabling public readiness,
and the same journey from the deployed game. Two real authenticated owners
through the Data API and a real UI account-switch race remain unqualified: only
the supplied owner was authorized. Existing synthetic RLS and adapter race tests
cover those boundaries but are not two issued-user-JWT proof. Never put session
or access tokens into logs or evidence captures.
