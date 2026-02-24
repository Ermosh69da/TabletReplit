import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";

import { MedicationsProvider } from "../components/MedicationsContext";
import { AppSettingsProvider } from "../components/AppSettingsContext";

import NotificationsAutoScheduler from "../components/NotificationsAutoScheduler";
import AndroidNotifeeScheduler from "../components/AndroidNotifeeScheduler";
import MedicationReminderOverlay from "../components/MedicationReminderOverlay";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AppSettingsProvider>
      <MedicationsProvider>
        {Platform.OS === "android" ? (
          <AndroidNotifeeScheduler />
        ) : (
          <NotificationsAutoScheduler />
        )}

        {/* карточка показывается при открытии из уведомления/после разблокировки */}
        {Platform.OS === "android" ? <MedicationReminderOverlay /> : null}

        <Stack screenOptions={{ headerShown: false }} />
      </MedicationsProvider>
    </AppSettingsProvider>
  );
}
