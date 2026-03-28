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

const STORAGE_KEY_STATUS = "@dayStatus_data_v1";

function safeJsonParse(s: any, fallback: any) {
  try {
    if (typeof s !== "string") return fallback;
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

async function scheduleSnoozeBackground(
  data: any,
  minutes: number,
  lines: string[],
) {
  const now = Date.now();
  const snoozeAt = new Date(now + minutes * 60 * 1000);
  const hh = String(snoozeAt.getHours()).padStart(2, "0");
  const mm = String(snoozeAt.getMinutes()).padStart(2, "0");
  const snoozeDisplayTime = `${hh}:${mm}`;

  const nextData = {
    ...data,
    auto: "0",
    displayTime: snoozeDisplayTime,
    snooze: "1",
    groupKey: String(data.groupKey || ""),
    dateKey: String(data.dateKey || ""),
    time: String(data.time || ""),
    dosesJson: String(data.dosesJson || "[]"),
    kind: "MED_REMINDER",
  };

  await notifee.createTriggerNotification(
    {
      id: `snooze:${data.groupKey || "unknown"}:${now}`,
      title: "Приём таблеток (отложено)",
      body: `${snoozeDisplayTime} • напоминание`,
      data: nextData,
      android: {
        channelId: "med_default_v6",
        sound: "med_sound",
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
          { title: "Отложить 15 мин", pressAction: { id: "SNOOZE_15" } },
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
}

if (Platform.OS === "android") {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;
    if (!notification || !notification.data) return;
    const data = notification.data as any;
    const actionId = pressAction?.id;

    if (type === EventType.ACTION_PRESS) {
      if (
        actionId === "TAKE_ALL" ||
        actionId === "SKIP_ALL" ||
        actionId === "SNOOZE_15"
      ) {
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
      }

      if (actionId === "TAKE_ALL" || actionId === "SKIP_ALL") {
        const statusToSet = actionId === "TAKE_ALL" ? "taken" : "skipped";
        try {
          const rawStatus = await AsyncStorage.getItem(STORAGE_KEY_STATUS);
          const dayStatus = safeJsonParse(rawStatus, {});
          const dateKey = String(data.dateKey || "");
          if (!dayStatus[dateKey]) dayStatus[dateKey] = {};
          const logicalTime = String(data.time || "00:00");
          const rawDoses = safeJsonParse(data.dosesJson, []);
          let list = rawDoses;
          if (list.length === 0 && data.medId) {
            list = [{ medId: data.medId, time: logicalTime }];
          }
          list.forEach((d: any) => {
            const doseTime = d.time || logicalTime;
            const dk = `${d.medId}@${doseTime}`;
            dayStatus[dateKey][dk] = statusToSet;
          });
          await AsyncStorage.setItem(
            STORAGE_KEY_STATUS,
            JSON.stringify(dayStatus),
          );
        } catch (e) {
          console.error("Ошибка сохранения статуса из фона", e);
        }
      } else if (actionId === "SNOOZE_15") {
        try {
          const lines = notification.android?.style?.lines || [];
          await scheduleSnoozeBackground(data, 15, lines);
        } catch (e) {
          console.error("Ошибка при откладывании из фона", e);
        }
      }
    }
  });
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ ...Ionicons.font });
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
        {Platform.OS === "android" ? <MedicationReminderOverlay /> : null}
        <Stack screenOptions={{ headerShown: false }} />
      </MedicationsProvider>
    </AppSettingsProvider>
  );
}
