# PrintOK — Mobile PWA

The original Figma Make GitHub repository now contains the files for installing PrintOK as a mobile web app.

## Publishing in Figma Make

1. Open https://www.figma.com/make/t0hQzy8mlmmV2ywJHOnnXp/PrintOK and pull/sync the latest changes from the PrintOK GitHub `main` branch.
2. Publish/Update the website at https://printok.figma.site/.
3. Verify the following HTTPS URLs return real files rather than a fallback HTML page:
   - https://printok.figma.site/manifest.webmanifest (JSON or manifest MIME type)
   - https://printok.figma.site/sw.js (JavaScript)
   - https://printok.figma.site/icons/icon-192.png (PNG)
   - https://printok.figma.site/icons/icon-512.png (PNG)
   - https://printok.figma.site/icons/icon-maskable-512.png (PNG)
   - https://printok.figma.site/icons/apple-touch-icon.png (PNG)
4. Open Chrome DevTools → Application → Manifest and Service Workers, check installation status and registration errors.
5. Test Android Chrome installation, then test iPhone Safari → Share → Add to Home Screen.

## What changes

- `public/manifest.webmanifest`: app name, theme, start URL and install icons.
- `public/icons/`: square 192px/512px, maskable 512px and Apple-touch 180px PNG icons.
- `public/sw.js`: minimal Service Worker with no request interception.
- `src/pwa.tsx`: mobile install control and iOS instructions, hidden on customer review URLs.
- `src/main.tsx`, `src/index.css`, `index.html`: integration without changing the existing Neon logic.
- `.figma/make/site.json`: correct app description and new favicon.

## Important constraints

PrintOK is **installable but online-only**: it needs the Neon backend and Internet for login, orders, versions and approvals. The Service Worker deliberately does NOT cache API responses, artwork, sessions or review links. Installing does not bypass the password requirement.

Figma Make hosting controls URL routing, caching and response headers. A successful GitHub commit or Vite build alone cannot verify the real `figma.site` installation flow; validate the public asset URLs after publishing. If Figma Make blocks service workers or rewrites these static paths, use a PWA-capable host for the same Vite project.

No `.github` workflow folder has been added to the original repo.
