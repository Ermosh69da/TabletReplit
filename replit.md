# Прими пилюльку!!! (Medication Reminder App)

A React Native/Expo application for tracking medication schedules with persistent storage and robust Android notifications.

## Features
- **Medication Management**: Add, edit, and remove medications with custom schedules.
- **Reminder Overlay**: A custom modal window that appears over the app to handle reminders.
- **Persistent Storage**: Uses `AsyncStorage` to save medication data and intake history.
- **Advanced Android Notifications**:
  - Reminders with "Take All", "Skip All", and "Snooze" actions.
  - Background event handling (works even if the app is closed).
  - Dedicated notification channels for regular reminders and snooze alerts.
  - Custom sound support.

## Tech Stack
- **Framework**: Expo (React Native)
- **Navigation**: Expo Router (Tabs)
- **Notifications**: `@notifee/react-native`
- **Storage**: `@react-native-async-storage/async-storage`
- **Icons**: `@expo/vector-icons` (Ionicons)

## Project Structure
- `app/`: Routing and main screen layouts.
- `components/`: Core logic and UI components.
  - `MedicationsContext.tsx`: State management for medications and history.
  - `AndroidNotifeeScheduler.tsx`: Logic for scheduling and managing notifications.
  - `MedicationReminderOverlay.tsx`: The UI for active reminders.
  - `AppSettingsContext.tsx`: Global app settings (notifications, quiet hours).

## Development
1. Install dependencies: `npm install`
2. Start development server: `npx expo start`
3. For Android notifications, ensure the app is built as a development build or APK.

## License
MIT
