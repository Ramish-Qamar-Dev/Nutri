# NutriLens

Mobile-friendly Capture, 3D Explorer, Nutrition, and an independent email/password admin dashboard. This is a web app, not a packaged native app. Subscription plans can be configured privately; billing is deliberately disabled.

## First admin login

1. Configure the Cloudflare D1 `DB` binding and apply the migrations in `drizzle/`.
2. Set server secrets `ADMIN_EMAILS` (allowed bootstrap email), `ADMIN_SETUP_TOKEN` (random 32-byte or stronger token), and `ADMIN_VAULT_KEY` (64 hexadecimal characters / 32 random bytes).
3. Open `/admin/setup`, enter the authorized email and setup token, and choose a unique 15–128 character password.
4. Sign in at `/admin` with that email and password. Setup is permanently closed while the owner account exists. Remove `ADMIN_SETUP_TOKEN` from hosting secrets after setup.

The local preview has database storage and bootstrap configuration prepared. The owner's setup instructions are in the private, ignored `work/admin-setup.txt`. The real owner account has deliberately not been created by the tests: choose the password in the app, never in chat. Local secrets in `.dev.vars` and all files under `work/` are excluded from the source archive.

`ADMIN_EMAILS` restricts initial enrollment only. After enrollment, database credentials and revocable sessions control admin access. ChatGPT identity headers and the starter's development cookie cannot grant admin access. The starter still supports separate customer ChatGPT sign-in.

## Admin functions

- **AI service:** enter or replace a Gemini key directly in the dashboard. The server encrypts it with AES-256-GCM before storing it in D1, using `ADMIN_VAULT_KEY` outside the database. The original credential is never returned. Saved credentials take precedence over an optional environment `GEMINI_API_KEY` fallback. Test AI generation sends a small structured text request using the configured model and key. It uses provider quota and identifies access, exposed-key, region, rate-limit, and service failures without returning raw provider responses. Successful text generation does not guarantee photo analysis or future quota.
- **Subscriptions:** create, edit, or archive plans with name, price in integer minor units, currency, monthly/yearly period, analysis allowance, and description. Optimistic versions reject stale edits. All plans remain admin-only; no public plan API, pricing screen, checkout, active status, or payment collection exists. Draft allowances do not activate customer entitlements.
- **Access:** change the current owner's password, invalidating all admin sessions.
- **Activity:** successful setup, sign-in, key changes, password changes, and plan changes are recorded without secret values. The dashboard shows recent events; cleanup retains 90 days.

## Security implementation

Passwords use salted scrypt (N=16384, r=8, p=5), with timing-safe comparison and bounded input. Sessions use random 256-bit tokens; only their SHA-256 hashes are stored. Production cookies use the `__Host-` prefix, Secure, HttpOnly, SameSite=Strict, and Path=/. They expire after eight hours, or 30 minutes of inactivity. Logout revokes the stored session. Password changes also prevent a concurrent old-password verification from issuing a new session.

All admin actions require server authentication except the guarded bootstrap/login endpoints. Mutations require a matching Origin. Authentication attempts are rate-limited in D1 by request address, email, and service-wide counts. Request bodies are bounded; SQL uses bound parameters. Admin responses use no-store caching, anti-framing, no-referrer, and content-type protection headers. There is no simulated admin login or public signup.

Photo analysis requires a customer identity or an admin password session, with durable service limits of 20 attempts per account and 100 globally per 24-hour window, starting at first use. Attempts are reserved before calling Google; failed attempts count too. These are safety limits, not paid plan entitlements. Provider billing can still apply.

Password hash settings follow the [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The implementation uses [Cloudflare's supported Node crypto runtime](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).

## Local development and migration

- `npm run dev` — local preview at port 5173.
- `npm run db:generate` — generate migrations after schema changes.
- `npm run build` — Worker and client output, with the declared D1 binding.
- Apply each pending SQL migration once: `node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wealthy_rage.sql`.

The current local database already has the initial migration. Do not replay it. Production deployment must apply the same migrations to the production binding; local data does not transfer automatically.

On restricted Windows environments where an OS account lookup fails, preload `--import ./scripts/windows-tooling.mjs` for Drizzle, Wrangler, or Miniflare commands. This narrowly falls back to existing process profile variables for the CLI's account lookup; it is not imported by the app.

## Operational recovery and launch requirements

Back up D1 and the independent vault key securely. Never replace `ADMIN_VAULT_KEY` without decrypting/re-encrypting existing credentials or intentionally replacing the saved API key under the new key. Do not include `.dev.vars`, `.env*`, private setup files, local database files, or recovery SQL in source uploads.

If the owner password is lost, an operator with privileged database access can run `node scripts/admin-password-hash.mjs` in a private interactive terminal. Input is hidden; it writes an owner-password update and session-revocation SQL file to `work/admin-recovery.sql`. Apply that file only to the intended database through the privileged hosting console/CLI, then securely remove it. The app provides no public password-reset or email-delivery system.

Before a public launch: deploy with HTTPS and production secrets, apply D1 migrations, finish owner setup, test the actual provider key, verify backups and recovery, and review monitoring and abuse limits under expected traffic. The current local preview is not a live deployment. Native-device testing, MFA, automated email recovery, and an independent security review have not been completed.

Before collecting subscriptions, connect a payment provider, verify webhook signatures/idempotency, persist customer entitlements, and enforce them server-side. Nothing in this change enables charges or makes subscription information visible to customers.

## Verification

- `node node_modules/typescript/bin/tsc --noEmit`
- `node --experimental-strip-types tests/admin-security.mjs`
- `node --experimental-strip-types tests/admin-integration.mjs` (requires a successful build; uses a fresh in-memory D1 database and fake credentials)
- `node tests/admin-http.mjs` (running local preview; anonymous/forged/simulated identities)
- `node tests/preview-modules.mjs /components/admin-dashboard.tsx`
- Existing `tests/gemini.mjs`, `tests/meal-model.mjs`, `tests/calorie-geometry.mjs`, and `tests/camera.mjs` remain available.

Worker integration covers bootstrap locking, password login, secure cookies, forged identity rejection, request-origin checks, encrypted key persistence, hidden plan CRUD and edit conflicts, logout, password-change revocation, inactivity expiry, throttling, and audit redaction. Tests do not use real provider credentials or charge for generation. Browser UI testing and hardware camera capture have not been performed.

## Meal estimates and privacy

Photos are resized to at most 1600 pixels and sent with optional notes to Google Gemini only when Analyze is selected. Meals and photos are not saved by the app. Calories use estimated macro grams and 4/4/9 factors. The 3D model visualizes ingredient calorie share, not actual food geometry or volume. Portion edits update numbers; qualitative observations describe the original photo. Estimates are not diagnoses or complete assessments of a person's diet.

Sample photo by Oskar Kadaksoo: https://unsplash.com/photos/a-bowl-of-food-on-a-plate-Be2IMDyTDII
