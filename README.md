# Family Expenses

An offline-first family expense tracker built with Expo and React Native. Android is the first target; the project is configured for iOS as well.

## What it does

- Dashboard with this month's total, category breakdown, and recent expenses
- Add, search, and delete expenses; record quantity and unit as well as category, date, notes, currency, and who paid
- Maintain a family member list on the device
- Reports with day, week, month, year, and custom date ranges; filter by category, subcategory, or product/description and view graphical spending breakdowns
- Side-panel navigation for dashboard, add expense, expenses, reports, family, and settings
- Scan receipt photos with on-device Google ML Kit or extract text from selectable-text PDFs. PDFs with item tables can create separate, editable expenses for each detected bill line. Quantities and units are inferred from printed package sizes when available (for example, `1 L` or `500 g`); otherwise, the item count uses `pc`. Photos suggest one expense from the receipt total. Scanned/image-only PDFs are not supported.
- Export and import a JSON backup to move expenses between phones

There is no account, hosted database, or automatic syncing. Each phone has its own local SQLite database. To share updates, export a backup from one phone and import it on another. Import merges records by ID and keeps the receiving phone's existing data.
If the receiving phone has no expenses yet, import adopts the backup's currency. If it already has expenses in a different currency, import asks you to align the currency first rather than relabeling amounts silently.

## Run on Android

```sh
npm install
npx expo run:android
```

Receipt scanning uses a native ML Kit module, so it needs an Android development build; it does not run inside Expo Go. `npx expo run:android` generates the native project and builds the app on a machine configured with Android Studio/SDK.

On Windows, if Gradle cannot find the SDK, set its path in the current PowerShell session before building:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:ANDROID_HOME\emulator;$env:ANDROID_HOME\platform-tools;$env:Path"
npx expo run:android
```

## Run in a browser

```sh
npm run web
```

The web build uses SQLite's WebAssembly module and requires Metro's WASM asset
support and cross-origin isolation headers; these are configured in
`metro.config.js`.

For iterative development after the native app is built:

```sh
npx expo start --dev-client
```

## iOS

The app and image-scanning library also support iOS. Building the native iOS app requires macOS and Xcode:

```sh
npx expo run:ios
```

## Data and privacy

Expenses and family members are stored in the app's local SQLite database. Receipt images and recognized text are not saved to an account or uploaded. Keep exported backup files private: they contain your expense history and family names.

Receipt scanning is a convenience, not a guarantee. Review the amount, date, and description before saving.