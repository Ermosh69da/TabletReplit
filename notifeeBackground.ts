import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  EventType,
  TriggerType,
} from "@notifee/react-native";

const UI_KIND = "MED_REMINDER";

// ИСПОЛЬЗУЕМ НОВЫЙ КАНАЛ V3 ДЛЯ КАСТОМНОЙ МЕЛОДИИ
const CHANNEL_DEFAULT = "med_default_v3";
const CHANNEL_SILENT = "med_silent";

// 15 минут
const SNOOZE_SECONDS = 15 * 60;

async function ensureChannels() {
  await notifee.createChannel({
    id: CHANNEL_DEFAULT,
    name: "Напоминания (лекарства)",
    importance: AndroidImportance.HIGH,
    sound: "med_sound", // <-- ИМЯ ТВОЕГО ФАЙЛА (без .mp3)
    bypassDnd: true, // ПРОБИВАЕМ "НЕ БЕСПОКОИТЬ"
  });

  // тихий канал
  await notifee.createChannel({
    id: CHANNEL_SILENT,
    name: "Напоминания (тихо)",
    importance: AndroidImportance.LOW,
  });
}

function hhmmFromDate(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function safeJsonParse<T>(s: any, fallback: T): T {
  try {
    if (typeof s !== "string") return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const notification = detail.notification;
  const pressAction = detail.pressAction;

  const data: any = notification?.data ?? {};
  if (data.kind !== UI_KIND) return;

  // ===== Отложить 15 минут =====
  if (type === EventType.ACTION_PRESS && pressAction?.id === "SNOOZE_15") {
    await ensureChannels();

    const now = Date.now();
    const snoozeAt = new Date(now + SNOOZE_SECONDS * 1000);
    const snoozeDisplayTime = hhmmFromDate(snoozeAt);

    const doses = safeJsonParse<any[]>(data.dosesJson, []);
    const lines = doses.slice(0, 6).map((d: any) => {
      const dosage = d.dosage ? ` (${d.dosage})` : "";
      return `${d.name}${dosage}`;
    });

    const id = `snooze:${String(data.groupKey ?? "unknown")}:${now}`;

    const nextData: Record<string, string> = {
      kind: UI_KIND,
      auto: "0",
      groupKey: String(data.groupKey ?? ""),
      dateKey: String(data.dateKey ?? ""),
      time: String(data.time ?? ""),
      displayTime: snoozeDisplayTime,
      medIdsJson: String(data.medIdsJson ?? "[]"),
      dosesJson: String(data.dosesJson ?? "[]"),
      snooze: "1",
    };

    await notifee.createTriggerNotification(
      {
        id,
        title: "Приём таблеток (отложено)",
        body: `${snoozeDisplayTime} • напоминание`,
        data: nextData,
        android: {
          channelId: CHANNEL_DEFAULT, // КАНАЛ V3
          sound: "med_sound", // СВОЯ МЕЛОДИЯ
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
      },
    );

    // убрать текущее уведомление
    if (notification?.id) {
      try {
        await notifee.cancelNotification(notification.id);
      } catch {}
    }

    return;
  }
});
