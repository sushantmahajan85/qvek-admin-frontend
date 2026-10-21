# Qvek Admin (frontend)

Admin panel for the Qvek EV-scooter rental platform. Next.js 14 (App Router) · TypeScript · Tailwind CSS · TanStack Query,
talking to `qvek-backend` (NestJS).

The UI is the redesigned admin panel from `qvek-prototype` (dark navy + green). Its CSS (`styles/base.css`, `styles/admin.css`)
is used unchanged, and the components render the same markup, so the look is pixel-identical to the prototype.

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3001
```

## How it is wired

```
lib/api-client.ts, lib/auth-session.ts   fetch wrapper (JWT + silent refresh), session storage   — unchanged
features/*/api.ts, features/*/hooks.ts   one module per backend area (TanStack Query)             — unchanged contract
features/live/                           loads everything the UI needs and maps it to the UI's read model
  provider.tsx                           fleet, riders, per-rider timelines, KYC (review queue), replacements, expenses, support
  map-state.ts                           API responses → `State` (lib/qvek/types.ts); layers local simulated actions on top
  sim-actions.ts                         browser-local actions for things the backend cannot do yet (see below)
lib/qvek/                                read model (`store`, `G`, `D`), selectors, page state, utils
components/qvek/                         shell, drawers, modals ("flows"), pages — the redesigned UI
app/                                     routes: /login and the authenticated (admin) group
middleware.ts                            cookie guard — unchanged
```

Pages read the synchronous read model (`G.rider(id)`, `store.state.vehicles`, …); `LiveDataProvider` rebuilds it every time
an API query changes, and mutations go through the existing feature hooks (which toast success / the server's error code
and invalidate the right queries).

## Real vs simulated

| Area | Backend |
|---|---|
| Login, 2FA, session refresh | real |
| Dashboard / fleet / vehicles (list, add, chassis-motor-controller record) | real |
| Riders (list, add, approve with paid token, reject, status transitions) | real |
| KYC details (masked numbers, signed doc links, edit) | real |
| Assignment, replacement (+ history), expenses (+ list) | real |
| Financial history (per-rider timelines, aggregated) | real |
| Settings: support number (`PUT /config/support`), plans (read-only), 2FA setup | real |
| Immobilize / unlock, vehicle status overrides | **simulated** (no endpoint) |
| Recovery steps: location shared / agent reached / unlocked | **simulated** (no endpoint); “returned” moves the rider to RETURNED on the server |
| Edit rider details (name, phone, age, platform) | **simulated** (no endpoint) |
| Alerts | derived from fleet/rider state; “read” marks are local |

Simulated actions are stored in `localStorage` (`qvek-admin-sim-v1`), layered over the live data, and always say so in
their toast. When the backend adds the endpoint, replace the `sim*` call with a mutation hook.

## Known limits (backend-driven)

* `GET /admin/riders` returns the 50 newest riders only; the admin shows those.
* There is no cross-rider money endpoint, so the Finance page fetches each rider's timeline.
* Vehicles have no odometer field; the last reading recorded in a replacement is shown.
* The hub position is not exposed by the API: set `NEXT_PUBLIC_HUB_LAT/LNG`, otherwise the map centres on the fleet.
