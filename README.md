# PrintOK — Neon-backed application

A real (non-demo) Arabic RTL printing proof and approval application built on the original Figma Make React/Vite project.

## Infrastructure (created 10 Nov 2026)

- Neon project: [PrintOK](https://console.neon.tech/app/projects/empty-pine-18083697) (ID: `empty-pine-18083697`)
- Region: `aws-eu-central-1` (Frankfurt), Postgres 18
- Database: `printok`, branch: `production`
- Neon Function API: `https://br-cold-wind-baoi51hy-printokapi.compute.c-8.eu-central-1.aws.neon.tech`
- Private object-storage bucket: `printok-artwork`
- Schema: six tables for settings, orders, file versions, sessions, login attempts and events; migration recorded at `backend/migrations/001_initial.sql`.

## Apply the frontend to original PrintOK Figma Make repository

Copy these changed files to the **same paths** in `eltawalbeh/PrintOK`:

- `src/App.tsx` (replace)
- `src/index.css` (replace)
- `src/api.ts` (new)
- `index.html` (replace; preserves Figma Make markers and adds RTL/no-referrer)

The existing `package.json`, `src/main.tsx`, Tailwind/Vite configuration, and Figma Make files can stay as they are. The public API URL is preconfigured in `src/api.ts`. To override, supply `VITE_PRINTOK_API_URL` in the Figma Make build environment. Do not set `DATABASE_URL` or any credentials in the frontend.

The `backend/` directory is the independently deployable Neon Function source, not a replacement for a Vite frontend file. The workflow compiles it to `backend/printokapi.zip` for Neon.

## Real workflows

1. Staff logs in using a temporary **password-only** credential verified on the backend, with a 12-hour revocable opaque session token stored hashed in Postgres. The password is never in GitHub or browser bundles.
2. Staff creates a real order or draft; submitted orders require a real PDF/PNG/JPEG upload (20MB max).
3. Artwork is stored in the **private** Neon object-storage bucket; only object keys and metadata are stored in Postgres.
4. Every new version requires separate approval. A secure 256-bit review token is generated with a 14-day expiry and linked to the current pending version.
5. Customer opens the review link on mobile **without a staff password**, sees the exact uploaded PDF/image and approves or requests changes.
6. The server atomically records the decision, rejects stale links or repeat approvals and writes an audit event; later versions reset the order to pending.
7. Dashboards, reports, activity, and settings load from Neon, not `localStorage` fixtures.

## Deployment and validation

- Frontend CI: [Validate PrintOK frontend](https://github.com/eltawalbeh/PrintOKChanges/actions/workflows/check-printok-frontend.yml)
- Neon API CI: [Build PrintOK Neon API](https://github.com/eltawalbeh/PrintOKChanges/actions/workflows/build-printok-api.yml)
- Backend dependencies declared in `backend/package.json`; build output is bundled for Node.js 24 into a single `index.mjs`, then zipped for Neon Function upload.
- Latest deployed Function status can be inspected in the Neon Console.
- Verify full staff login, actual upload, PDF/image rendering, review link, approve/change decisions, and login rate-limiting **on the published frontend** before relying on it for production.

## Security and operational limitations

- Password-only is a temporary shared-login setup, **not** a final multi-user identity/permission system. Rotate the initial password after handoff and migrate to per-user accounts and audit identities.
- Review links are bearer credentials: share only with the intended customer. Generating a new link replaces the previous token. Old-version links are rejected after a new upload.
- The frontend temporarily retains a session token in **sessionStorage** to survive reload. Use stricter session security, enhanced abuse protection, backups and monitoring for public production.
- The API uses HTTPS and stores only hashes of password verification input and opaque session/review tokens. No database or object-store secrets should be copied to this public repository.
- The real database starts empty: demo customers and fabricated orders have **not** been imported.
- Domain-specific UX and end-to-end production acceptance remain to be verified in the Figma Make preview/published app.

## Key links

- [Original Figma design](https://www.figma.com/design/n6Vv2dTAInthPQ9MEJwh42/PrintOK?node-id=19-2)
- [Source app, keep unchanged here](https://github.com/eltawalbeh/PrintOK)
- [Changes and deployment assets](https://github.com/eltawalbeh/PrintOKChanges)
