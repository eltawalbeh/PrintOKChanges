# PrintOK Desktop — Windows 10 (Local Edition)

**Version:** 0.1.0 pre-release · **Platform:** Windows 10/11 x64 · **Distribution:** NSIS installer, standalone portable executable and portable ZIP.

This is a **separate local-first application**. It does **not** replace PrintOK Figma Make, the hosted site, or the Neon database. The project files stay under \`desktop/\` in the private \`eltawalbeh/PrintOKChanges\` repository.

## Download

[GitHub Desktop Releases](https://github.com/eltawalbeh/PrintOKChanges/releases) — sign in to your GitHub account to see private release assets.

- \`PrintOK-Desktop-Setup-0.1.0.exe\`: installation on Windows, optional install directory.
- \`PrintOK-Desktop-Portable-0.1.0.exe\`: no-install executable.
- \`PrintOK-Desktop-Windows10-Portable.zip\`: ZIP containing the portable executable.

First launch creates a **local password** (8+ characters). Password verification is performed offline with PBKDF2/SHA-256, salted and stored in the local app settings. Local files are **not encrypted by the app**; use Windows account security and disk encryption if necessary.

## Storage model

The default database is **Documents / PrintOK Data / printok-db.json**. It is a JSON datastore written with temporary-file/rename atomic replacement. Original PDFs/PNGs/JPGs are **physically copied** into customer folders:
\`\`\`text
Documents/
  PrintOK Data/
    printok-db.json
    clients/
      Client Name-<customer-key>/
        orders/
          PK-000001/
            V1/design-...pdf
            V2/design-...png
\`\`\`

In **Settings > Main Storage**, select an empty destination folder. The application copies existing data to the new location and changes the database's internal file paths. The original folder is **retained** as a safety fallback. It does not silently delete previous data.

In **Settings > Customer Storage**, choose an independent folder per customer. The selected folder receives **new files** for that customer; existing files continue to open from their saved original locations. Contact numbers are used to match repeat customers. Opening a customer's folder uses Windows Explorer.

The **Backup** action copies the database and default-root files; externally stored client files are copied into \`extra/\` and listed in a restore manifest. Restoring backups is manual in this first release.

## What works without internet

- View/search/filter orders and clients, by name, phone, product, reference and status
- Create orders and drafts, native file-picker + drag-and-drop
- Copy real artwork to Windows folders with per-customer settings
- Review previous artwork versions and open them with Windows file associations
- Register **local** approval/change decisions, preserving version history
- Store reference files and notes for requested changes
- Offline password-only sign-in, settings, activity log, file backups

## Online updates

The application checks GitHub Releases for a new tag named \`desktop-vX.Y.Z\`. Installation is **manual** from the Release page; this is **not automatic self-patching**.

**Important:** \`PrintOKChanges\` is a **private GitHub repository**. Unaunthenticated release checks cannot see its releases. You can still open the Release page in your authenticated browser. For in-app checks, use **Settings > Private GitHub update access** and provide a **fine-grained personal access token** restricted to \`eltawalbeh/PrintOKChanges\` with **Contents: Read**. The token is verified with GitHub and encrypted on Windows using Electron \`safeStorage\` (OS-backed secret protection), never bundled into the app.

## What is explicitly not included

- No automatic synchronization between Windows and Neon, web orders, or Figma Make
- No cross-device customer review links or online approvals from the desktop app
- No end-to-end encryption of stored client artwork
- No installer code-signing certificate yet: Windows SmartScreen may warn about an unknown publisher
- No automatic install of new desktop versions

## Build

Requirements: Node.js 24+, Windows 10/11 x64.

\`\`\`powershell
cd desktop
npm install
npm run check
npm run build
npm run package:win
\`\`\`

Outputs are in \`desktop/release/\`. A GitHub Actions Windows runner also builds both the installer and portable versions and publishes the Desktop pre-release.

## Design reference and separation

- [PrintOK Figma design](https://www.figma.com/design/n6Vv2dTAInthPQ9MEJwh42/PrintOK?node-id=19-2)
- [PrintOK live website](https://printok.figma.site/)
- [Web code](https://github.com/eltawalbeh/PrintOK)
- [Change repo and Desktop release](https://github.com/eltawalbeh/PrintOKChanges)

**Do not copy \`desktop/\` into Figma Make**. It is a separate Electron app. Keep the Windows build workflow under the *Changes* repository's \`.github/workflows/\`; Figma Make does not need that folder.
