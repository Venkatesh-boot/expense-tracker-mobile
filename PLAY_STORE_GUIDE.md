# Google Play Store Release & Compliance Checklist

App Name: **Family Expense Tracker**  
Package ID: `com.oneeye.familytracker`  
Current Release Version: `versionCode 3` (`1.0.2`)  
Target SDK: `36` (Android 16) • Min SDK: `24` (Android 7.0)  

---

## 1. Upload Artifacts Prepared
- **Signed Android App Bundle (`.aab`)** for Play Store upload:
  `android/app/build/outputs/bundle/release/app-release.aab`
- **Signed Release APK (`.apk`)** for direct testing:
  `android/app/build/outputs/apk/release/app-release.apk`
- **Upload Keystore** (KEEP SAFE — back up both files offline/private):
  - `android/app/upload-keystore.jks`
  - `android/keystore.properties`
  - *(Note: `.gitignore` excludes these files so credentials are never committed to Git.)*

---

## 2. Store Listing Graphic Assets Ready (`store-assets/`)
- **App Icon (512 × 512 PNG)**: `store-assets/icon-512.png`
- **Feature Graphic (1024 × 500 PNG)**: `store-assets/feature-graphic-1024x500.png`
- **Phone Screenshots (You need 2–8 screenshots)**: Take 3–5 screenshots from the app on your Samsung phone (Dashboard, Add Expense, Price Trends, Reports, Google Drive Sync).

---

## 3. Host Privacy Policy URL (Required by Play Console)
Google Play Console requires a live public HTTPS link to your privacy policy:
1. A complete HTML privacy policy is ready at `docs/privacy-policy.html`.
2. Push your repository to **GitHub** (public repo or Pages enabled) → **Settings → Pages → Source: `main` branch `/docs` folder**.
3. Your URL will look like: `https://<your-github-username>.github.io/<repo-name>/privacy-policy.html`
   *(Alternatively, paste the text into Google Sites or Blogger and publish.)*

---

## 4. Exact Google Play Console Policy Answers

### A. App Access
- Choose: **All functionality in my app is available without any access restrictions** *(No login or test account needed).*

### B. Ads
- Choose: **No, my app does not contain ads.**

### C. Content Rating
- Category: **Utility, Productivity, Communication, or Other** (Finance/Productivity)
- All violence, mature content, social sharing, UGC, and location sharing questions: **No**.

### D. Target Audience & Content
- Target age group: **18 and over** (or 13–15, 16–17, 18+ — avoid selecting Under 13 unless you complete Families Policy review).

### E. Data Safety Form
- **Does your app collect or share any of the required user data types?**: **No**
  - All expense records remain locally in SQLite on the user's device.
  - Camera receipt images are processed on-device via ML Kit and never uploaded by the developer.
  - Google Drive sync writes only to the user's chosen document inside their own Google Drive.

### F. Financial Features Declaration
- Under **App Content → Financial features**:
  - Select: **My app doesn't provide any financial features** (or check "Expense / budget tracking only" if prompted — it does **not** connect bank accounts, offer loans, trading, crypto, or process payments).

### G. Permissions Justification (Already Minimized)
- `SYSTEM_ALERT_WINDOW`: Removed from release builds.
- `RECORD_AUDIO`: Removed.
- `READ_SMS` / `RECEIVE_SMS`: Not present.
- `CAMERA`: Used solely when the user taps Receipt Scan (`expo-image-picker` + on-device OCR).

---

## 5. Closed Testing Requirement (Personal Developer Account)
If registering as a **Personal** developer account:
1. Create an **Internal Testing** release first with `app-release.aab` to verify installation on your own + wife's phone via Play Store.
2. Promote to **Closed Testing** with at least **12 testers opted in for 14 continuous days** (Google Play's rule for new Personal accounts) before **Production** unlocks.
*(Wait: if migrating from your earlier debug-signed sideloaded APK to the Play Store / upload-signed build, remember to Export JSON → uninstall old debug APK → install Play Store build → Import JSON.)*
