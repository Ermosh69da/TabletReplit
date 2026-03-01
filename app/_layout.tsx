import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import notifee, {
  EventType,
  TriggerType,
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
} from "@notifee/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { MedicationsProvider } from "../components/MedicationsContext";
import { AppSettingsProvider } from "../components/AppSettingsContext";

import NotificationsAutoScheduler from "../components/NotificationsAutoScheduler";
import AndroidNotifeeScheduler from "../components/AndroidNotifeeScheduler";
import MedicationReminderOverlay from "../components/MedicationReminderOverlay";

// Ключ базы данных из MedicationsContext
const STORAGE_KEY_STATUS = "@dayStatus_data_v1";

function safeJsonParse(s: any, fallback: any) {
  try {
    if (typeof s !== "string") return fallback;
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

// 🚀 МОЩНЫЙ ОБРАБОТЧИК ФОНОВЫХ СОБЫТИЙ (РАБОТАЕТ ДАЖЕ ЕСЛИ ПРИЛОЖЕНИЕ УБИТО)
if (Platform.OS === "android") {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;
    if (!notification || !notification.data) return;

    const data = notification.data as any;
    const actionId = pressAction?.id;

    if (type === EventType.ACTION_PRESS) {
      // 1. ДЕЙСТВИЯ "ПРИНЯТЬ" ИЛИ "ПРОПУСТИТЬ" С ЭКРАНА БЛОКИРОВКИ
      if (actionId === "TAKE_ALL" || actionId === "SKIP_ALL") {
        const statusToSet = actionId === "TAKE_ALL" ? "taken" : "skipped";

        try {
          // Читаем базу данных напрямую из памяти телефона
          const rawStatus = await AsyncStorage.getItem(STORAGE_KEY_STATUS);
          const dayStatus = safeJsonParse(rawStatus, {});

          const dateKey = String(data.dateKey || "");
          if (!dayStatus[dateKey]) dayStatus[dateKey] = {};

          // Разбираем таблетки из уведомления
          const logicalTime = String(data.time || "00:00");
          const rawDoses = safeJsonParse(data.dosesJson, []);
          let list = rawDoses;

          if (list.length === 0 && data.medId) {
            list = [{ medId: data.medId, time: logicalTime }];
          }

          // Обновляем статусы в базе
          list.forEach((d: any) => {
            const doseTime = d.time || logicalTime;
            const dk = `${d.medId}@${doseTime}`;
            dayStatus[dateKey][dk] = statusToSet;
          });

          // Сохраняем обновленную историю приема
          await AsyncStorage.setItem(
            STORAGE_KEY_STATUS,
            JSON.stringify(dayStatus),
          );

          // Полностью очищаем уведомления этой группы из шторки
          if (data.groupKey) {
            const shown = await notifee.getDisplayedNotifications();
            const groupIds = shown
              .filter((x) => x.notification.data?.groupKey === data.groupKey)
              .map((x) => x.notification.id)
              .filter(Boolean);

            await Promise.all(
              groupIds.map((id) => notifee.cancelNotification(id!)),
            );
          } else if (notification.id) {
            await notifee.cancelNotification(notification.id);
          }
        } catch (e) {
          console.error("Ошибка сохранения статуса из фона", e);
        }
      }

      // 2. ДЕЙСТВИЕ "ОТЛОЖИТЬ НА 15 МИНУТ" С ЭКРАНА БЛОКИРОВКИ
      else if (actionId === "SNOOZE_15") {
        try {
          if (notification.id)
            await notifee.cancelNotification(notification.id);

          const now = Date.now();
          const snoozeAt = new Date(now + 15 * 60 * 1000);
          const hh = String(snoozeAt.getHours()).padStart(2, "0");
          const mm = String(snoozeAt.getMinutes()).padStart(2, "0");
          const snoozeDisplayTime = `${hh}:${mm}`;

          const nextData = {
            ...data,
            auto: "0",
            displayTime: snoozeDisplayTime,
            snooze: "1",
          };

          const lines = notification.android?.style?.lines || [];
          const channelId = notification.android?.channelId || "med_default_v3";

          await notifee.createTriggerNotification(
            {
              id: `snooze:${data.groupKey}:${now}`,
              title: "Приём таблеток (отложено)",
              body: `${snoozeDisplayTime} • напоминание`,
              data: nextData,
              android: {
                channelId: channelId,
                sound: channelId === "med_default_v3" ? "med_sound" : undefined,
                category: AndroidCategory.ALARM,
                importance: AndroidImportance.HIGH,
                smallIcon: "ic_launcher",
                pressAction: { id: "OPEN", launchActivity: "default" },
                fullScreenAction: { id: "OPEN", launchActivity: "default" },
                actions: [
                  {
                    title: "Принять всё",
                    pressAction: { id: "TAKE_ALL", launchActivity: "default" },
                  },
                  {
                    title: "Пропустить всё",
                    pressAction: { id: "SKIP_ALL", launchActivity: "default" },
                  },
                  {
                    title: "Отложить 15 мин",
                    pressAction: { id: "SNOOZE_15" },
                  },
                ],
                style: { type: AndroidStyle.INBOX, lines },
              },
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp: snoozeAt.getTime(),
              alarmManager: { allowWhileIdle: true },
            },
          );
        } catch (e) {
          console.error("Ошибка при откладывании из фона", e);
        }
      }
    }
  });
}

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

        {/* Эта карточка перехватит запуск приложения и покажет окно */}
        {Platform.OS === "android" ? <MedicationReminderOverlay /> : null}

        <Stack screenOptions={{ headerShown: false }} />
      </MedicationsProvider>
    </AppSettingsProvider>
  );
}
