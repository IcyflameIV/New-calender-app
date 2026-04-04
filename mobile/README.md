# Mobile App

This workspace contains a first native mobile app shell for the calendar using Expo.

## What it includes

- Shared sunrise/tithi/month logic from the main project
- Native month navigation
- Paksha sections for waxing and waning days
- Country and city selection from `../locations.json`
- Traditional and English label modes
- Offline period tracking stored on the device with AsyncStorage

## What it does not include yet

- Push notifications
- Offline asset polishing

## Run

From `/Users/icyflame/Documents/GitHub/New-calender-app/mobile`:

```bash
npm install
npm run start
```

Then:

- open **Expo Go** on your phone and scan the QR code, or
- press `i` for the iOS simulator, or
- press `a` for the Android emulator.

Expo Go works for this app after the mobile dependencies are installed.
