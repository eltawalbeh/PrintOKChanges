# PrintOK Mobile PWA — Delivery via PrintOKChanges

**Delivery policy:** All new work is committed to `eltawalbeh/PrintOKChanges`. The source `eltawalbeh/PrintOK` is **not** the development destination. Apply the ZIP below using Figma Make, then publish from Figma Make.

**Download:** [PrintOK-PWA-Changes.zip](./PrintOK-PWA-Changes.zip)

## Contains these original relative paths

- `index.html` — manifest, iOS install metadata and app theme.
- `src/main.tsx` — register the PWA and render the mobile install control.
- `src/index.css` — existing PrintOK CSS plus small installation UI.
- `src/pwa.tsx` — mobile install prompt / iOS home-screen instructions / worker registration.
- `.figma/make/site.json` — app name, metadata and icon.
- `public/manifest.webmanifest` — PWA metadata and 192/512 icons.
- `public/sw.js` — no-fetch Service Worker, never caching customer information.
- `public/icons/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- `PWA_SETUP.md` — publishing, mobile tests and security notes.

**Do not copy the `.github` directory into Figma Make.** Changes repo workflows are just for CI and packaging; the ZIP does not include them.

## How to apply

1. Open [PrintOK Figma Make](https://www.figma.com/make/t0hQzy8mlmmV2ywJHOnnXp/PrintOK).
2. Import/replace files from the ZIP preserving the original relative paths.
3. Preview and publish.
4. Open [the published site](https://printok.figma.site/) on Android Chrome or iPhone Safari; follow the install prompt / Add to Home Screen.
5. Verify `/manifest.webmanifest`, `/sw.js` and `/icons/icon-192.png` are served correctly (not rewritten to HTML). Check Chrome DevTools → Application → Manifest / Service Workers.

This PWA requires internet to log in, view orders and approve print artwork. Service Worker deliberately never caches customer data or PDFs. Figma hosting support for SW and manifest must be tested on the published domain before claiming installability.

**Scope:** Mobile PWA only. No unrelated web features, backend code or desktop assets are shipped in this ZIP.
