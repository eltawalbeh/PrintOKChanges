# PrintOK — Figma Make implementation bundle

This repository contains **only new or changed source files**, preserving their original paths relative to `eltawalbeh/PrintOK`. The runtime source repository has not been modified.

## Apply to the Figma Make source

1. Copy the contents of this repository into the root of the `PrintOK` project, **preserving paths**.
2. Replace `src/App.tsx` and `src/index.css` with these files.
3. Run `pnpm install` (only if necessary) and `pnpm build`, or use Figma Make's existing preview.

## Implemented screens

- Orders dashboard: Arabic RTL navigation, statistics, search and status/date filters
- Create print order: required-field validation, draft creation, local file selection, submit for review
- Order details: current design proof, version history, new-version upload, review link
- Customer mobile review: version-specific approve/request-change flow
- Additional interactive activity and basic settings screens

## Important scope notes

This is a **frontend prototype**, backed by browser `localStorage`, not a deployed multi-user system. The data and selected file names persist locally; file bytes are **not** uploaded, shared, or stored. Review URLs are demonstrative and are not secure, sharable cross-device customer links without backend/database integration, authentication and server-side version validation. Do not use the prototype to authorize production jobs.

Visual source: [PrintOK Figma design](https://www.figma.com/design/n6Vv2dTAInthPQ9MEJwh42/PrintOK?node-id=19-2).

Source app: https://github.com/eltawalbeh/PrintOK
