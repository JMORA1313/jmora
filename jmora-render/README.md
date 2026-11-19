# JMORA — Minimalist Fitness, Anatomy & Athletic Store (Web + PWA + Android APK)

JMORA is a bilingual (**Persian RTL / English LTR**, **Light / Dark mode**) fitness platform and modular e-commerce web application configured as a **Progressive Web App (PWA)** and ready for **Android APK** packaging via Capacitor or Trusted Web Activity (TWA).

## Key Features
- **Interactive Muscle Guide (Front & Back SVG)**: Clickable bilateral muscle anatomy with level/equipment/location filters, form cues, common mistakes, and biomechanics motion previews.
- **Personal Info & Free-Text Goal Submission**: Users enter their physical profile and type their fitness goal in their own words; submissions are persisted to the backend (`data/store.json`) and visible in the Admin Console.
- **In-Site Support Ticket System**: Direct support ticket creation and admin replies directly on the platform with support open hours displayed cleanly.
- **JMORA Athletic Store & Reymit Payment (`reymit.ir/JMORA`)**:
  - Product prices automatically calculated using `USD * 260,000 + 600,000` Toman.
  - Checkout directs buyers to `https://reymit.ir/JMORA` with explicit payment description instructions (selected item name, exact home address, accurate identity, and exact invoice total).
- **Role-Based Admin Console**: Admin sections unlock upon authentication with the designated admin phone number or admin email.

## Development & Verification
```bash
npm install
npm run dev       # Express + Vite middleware on http://localhost:3000
npm run lint      # TypeScript check (tsc --noEmit)
npm run build     # Production web & PWA service worker bundle -> dist/
```

## Packaging as an Android APK

### Option A: Capacitor (Native Android APK wrapper)
`capacitor.config.json` is preconfigured (`appId: "fit.jmora.app"`, `appName: "JMORA"`, `webDir: "dist"`):
```bash
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
npx cap open android   # Build Release/Debug APK in Android Studio
```

### Option B: Bubblewrap CLI (PWA -> Signed TWA APK)
Once deployed over HTTPS (`manifest.webmanifest` is emitted by `vite-plugin-pwa`):
```bash
npx @bubblewrap/cli init --manifest=https://your-jmora-domain.com/manifest.webmanifest
npx @bubblewrap/cli build
```
