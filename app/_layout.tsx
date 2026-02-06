import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";

import { MedicationsProvider } from "../components/MedicationsContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...Ionicons.font, // важно для @expo/vector-icons на web
    // Если у тебя есть кастомные шрифты и ты их используешь через fontFamily —
    // добавь их сюда, например:
    // Inter: require("../assets/fonts/Inter-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <MedicationsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MedicationsProvider>
  );
}