# Swaad browser acceptance

`npm run test:e2e` is the primary acceptance command: Chromium uses the real
frontend and local/dev backend. Only external providers (payment, delivery,
OTP, email) are mocked **inside the backend**. It does not intercept or replace
backend responses. Authentication is bootstrapped using a seeded demo client
session; login, onboarding and human approvals are not covered or fabricated.

`npm run test:e2e:mock` is supplemental, deterministic **network-mocked** UI
coverage. It cannot satisfy real-backend acceptance. The frontend CI job runs
this supplemental suite; the integrated backend run is a separate release gate.

## Install

For a complete local run, use `E2E_LOCAL_SEED=1` with `E2E_BACKEND_URL`.
It creates one fictional customer and private two-hour session per scenario in
the guarded disposable stack. This isolates carts, addresses and per-user rate
limits; no limiter is disabled or Redis bucket deleted. A manually supplied
session is useful for a single scenario, but repeated runs share its allowance.

Use Node 22 or newer, then:

```sh
npm ci
npm run test:e2e:install
```

Linux CI uses `npx playwright install --with-deps chromium`.
Configuration follows [Playwright projects](https://playwright.dev/docs/test-projects)
and [web server configuration](https://playwright.dev/docs/test-webserver).

## Real backend prerequisites (owned by backend/main agent)

Run the integrated serviceability backend after syncing the parent security
fixes. The parent branch alone lacks `/api/v1/orders/serviceability`.
Use an isolated disposable demo database; tests create addresses, carts,
orders and payments. They do not delete records or reset shared infrastructure.

Current integration target:

- Backend: `http://127.0.0.1:18080`.
- PostGIS: localhost:5432, database `swaad_e2e_20260911` (local postgres/postgres).
- Dedicated Redis: localhost:16379; dedicated NATS: localhost:14222.
- Apply all migrations and the backend's `scripts/seed_demo.sql` catalog.
- `PAYMENT_PROVIDER=mock`, `DELIVERY_PROVIDER=mock`, `OTP_PROVIDER=mock`,
  `EMAIL_PROVIDER=mock`, `MOCK_DELIVERY_DURATION_SECONDS=15`.
- The seeded active/open `Kesar Thali Ghar` must have available
  `Kesar Special Thali` (restaurant ID `10000000-0000-4000-8000-000000000001`,
  item ID `40000000-0000-4000-8000-000000000001`).
- Seed an active nondeleted demo `client`, with `onboarding_complete=true` and
  a successful `GET /api/v1/users/me/profile`. Do not reuse real human identities
  or grant owner/driver approvals for these tests.
- Supply a fresh HS256 access token signed with the running backend secret:
  `user_id` and `sub` match that client, `role=client`, `jti` identifies a session,
  and valid `iat`, `nbf`, `exp`. Redis `session:<jti>` must be an active hash
  (`is_active=true`) with suitable TTL and the normal session metadata.
  Prefer the normal mock OTP APIs or main's isolated fixture provisioner.
- Seed one address owned by this client labelled `E2E outside radius`, with
  latitude `24.000000`, longitude `75.000000`, and otherwise valid address fields.
  Keep it among the first 20 addresses. The UI currently fixes newly created
  addresses at Shamgarh coordinates; changing the pincode cannot test radius.

Place session credentials in a private file outside the repository (mode 0600):

For the isolated local stack above, the committed helper creates a new fictional
approved client, outside-radius address, and two-hour Redis/JWT session:

```sh
E2E_AUTH_FILE=/tmp/swaad-browser-session-unique.json node tests/e2e/seed-session.cjs
```

The file must not already exist. The helper refuses non-`swaad_e2e_*` database
names and non-`swaad-e2e-*` Redis containers. It uses local demo credentials only;
never point it at a shared/production environment. Run with the matching
`E2E_JWT_SECRET` if the backend's demo JWT secret differs. Authentication remains
a test fixture, not browser login coverage.

```json
{"accessToken":"<fresh demo token>","userId":"<demo client UUID>","deviceId":"<session device ID>"}
```

```sh
E2E_BACKEND_URL=http://127.0.0.1:18080 \
E2E_AUTH_FILE=/absolute/private/path/session.json \
npm run test:e2e
```

Alternatively set `E2E_ACCESS_TOKEN`, `E2E_USER_ID`, and `E2E_DEVICE_ID` in the
environment. Missing credentials fail, never silently skip. Optional
`E2E_OUTSIDE_ADDRESS_LABEL` changes the saved negative fixture label;
`E2E_TRACKING_TIMEOUT_MS` defaults to 90000. Delivery uses real polling/time.
The default backend duration is 600 seconds, so shorten it as above or increase
the timeout. Each run creates a uniquely labelled demo address and leaves data
for backend verification/cleanup. A sanitized attachment records order/address
IDs and the quoted amount after the successful journey.

Both modes start an owned Vue dev server on localhost:4173 (`E2E_PORT` overrides),
force relative `/api/v1` requests, and never reuse another agent's server.
The real backend URL is supplied to the existing Vue proxy. Production bundles
are verified separately with `npm run build`.

## Supplemental mocked coverage

```sh
npm run test:e2e:mock
```

Includes browse/cart/address creation/place/pay/delivery polling; unsupported
address and recovery; failed serviceability; last-item removal; pending removal
locking; cart refresh failure; declined payment error; out-of-order serviceability
and quote responses; and a late quote after the last item is removed. Race tests
use controlled response handshakes, not arbitrary sleeps. Mock responses model
cart consumption at placement. The decline test only checks the initial error,
not successful payment retry (that behavior requires a source fix if broken).

Reports, screenshots and mocked failure traces live under
`node_modules/.cache/swaad-e2e/` (already ignored). Live traces are disabled to
avoid retaining bearer credentials. Do not upload private auth files. CI
artifacts are explicitly named `chromium-mocked-evidence`.

Selectors use roles, labels, visible headings and item text. One fallback uses
`.restaurant-card` scoped to its visible restaurant title. Optional request to
the source owner: give each card an accessible group/region name and item action
buttons names including the dish. No app source changes are required to run.
