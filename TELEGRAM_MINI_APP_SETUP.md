# PrintOK — Telegram Mini App delivery

**Target:** Existing published HTTPS application at https://printok.figma.site/  
**Source of changes:** `eltawalbeh/PrintOKChanges` ONLY.  
**Do not push directly to `eltawalbeh/PrintOK`.**  
**Neon API and database remain unchanged.**

## What the update does

- Loads Telegram's official `telegram-web-app.js` bridge in `index.html`.
- Detects a real Telegram Web App launch via the presence of the launch payload; normal browser visits continue to work.
- Calls `ready()` and `expand()` and aligns Telegram's header/background to PrintOK's existing light UI.
- Uses Telegram's native Back button for staff internal pages, and returns from the customer revision screen when applicable.
- Adapts safe-area and in-app viewport height for Telegram mobile clients.
- Hides the independent PWA install prompt while running inside Telegram.
- Keeps PrintOK's **existing password-based staff authentication**, Neon API and versioned customer approvals as-is.
- **Does not** authenticate a Telegram user from `initDataUnsafe` or store a Telegram bot token in frontend code.

### Files to apply via Figma Make

Use `PrintOK-Telegram-Mini-App-Changes.zip` in this repository. It preserves these exact project paths:

```text
index.html
src/main.tsx
src/App.tsx
src/index.css
src/pwa.tsx
src/telegram.ts
TELEGRAM_MINI_APP_SETUP.md
```

Apply the 6 application files to their original paths (the Markdown is for instructions), **then publish from Figma Make**. The ZIP does not contain `.github`, `desktop/`, `backend/`, database migrations or secrets. Do not copy workflow/CI files into Figma Make.

## BotFather — required Telegram-side setup

A Mini App is attached to an actual Telegram bot; shipping a React bundle alone does **not** create or publish that bot.

1. Open the official [@BotFather](https://t.me/BotFather) from your Telegram account.
2. If you already own a suitable bot, select it from `/mybots`. Otherwise use `/newbot`, choose a display name such as **PrintOK** and a unique username ending in `bot` (example format only: `YourPrintOKBot`; not claimed as available).
3. Configure the **Main Mini App** under **Bot Settings → Configure Mini App** (BotFather UI labels may vary) and use the public URL:
   ```
   https://printok.figma.site/
   ```
4. Configure **Menu Button** via `/setmenubutton` if desired: select your bot, set the same HTTPS URL, and label the button **افتح PrintOK**.
5. Test the **Launch App / Open App** button on the bot's profile and the in-chat menu. If Main Mini App is configured, the shareable link format becomes `https://t.me/<your_bot_username>?startapp` (use your **actual** username; no bot is created by this repository).

**Keep the bot token private.** The frontend does not need it. Do not add it to Figma, GitHub files, browser code, or the chat.

## QA after Figma Make Publish + BotFather configuration

1. Open the bot inside Telegram Android, iOS and Desktop; launch the Mini App.
2. Check app fits inside Telegram and opens the keyboard and customer file picker as expected.
3. Log in using the normal PrintOK password, navigate Orders → Details → Back, Orders → New → Back, and Settings → Back.
4. Test order search/filter, creating a draft/order with uploaded PDF or image, and viewing order detail.
5. Confirm the PWA install suggestion is **not** shown inside Telegram.
6. Open the same `https://printok.figma.site/` in regular Chrome/Safari: normal web/PWA operation must remain unchanged.
7. Test a customer review URL separately, including approve and request changes; version approval tokens are private links and must **never** be inserted into a public bot description or Mini App root URL.
8. Confirm no console errors about Telegram JS or restrictive Figma-hosting CSP.

### Important limits

- **Not launched in Telegram until you configure BotFather**; without a bot identity, this deliverable is technically prepared, not Telegram-published.
- This is the **same production web app**, inside Telegram's WebView; it is not a separate backend or bot message-processing service.
- Staff login still requires PrintOK's password; Telegram accounts do **not** automatically grant permission to private staff data.
- Automatic Telegram notifications, Telegram Login SSO, chat bots and two-way chat integrations are separate future features that require explicit backend/bot authentication work.
- `figma.site` HTTPS hosting and script loading must be validated after publish; GitHub CI only checks TypeScript and web compilation.

## Reference

- Telegram official Mini Apps: https://core.telegram.org/bots/webapps
- Bot features, menu buttons: https://core.telegram.org/bots/features
- PrintOK Figma Make: https://www.figma.com/make/t0hQzy8mlmmV2ywJHOnnXp/PrintOK
- PrintOK published website: https://printok.figma.site/
