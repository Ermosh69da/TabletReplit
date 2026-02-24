import { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  TriggerType,
} from "@notifee/react-native";

import {
  useMedications,
  type Medication,
  periodLabel,
} from "./MedicationsContext";
import { useAppSettings } from "./AppSettingsContext";

const UI_KIND = "MED_REMINDER";
const WINDOW_DAYS = 5;

// КАНАЛ V3 ДЛЯ СВОЕЙ МЕЛОДИИ
const CHANNEL_DEFAULT = "med_default_v3";
const CHANNEL_SILENT = "med_silent";

const DEBUG_KEY = "notifee_scheduler_debug_v1";

function dateKeyFromDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function normalizeTime(t: string) {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
}

function getTimes(m: Medication): string[] {
  const anyM: any = m;

  if (Array.isArray(anyM.times) && anyM.times.length > 0) {
    return Array.from(
      new Set(anyM.times.map((t: any) => normalizeTime(String(t).trim()))),
    )
      .filter(Boolean)
      .sort();
  }

  const raw = typeof anyM.time === "string" ? anyM.time : "";
  const matches = raw.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
  const normalized = matches.map(normalizeTime).filter(Boolean);
  if (normalized.length > 0) return Array.from(new Set(normalized)).sort();
  if (raw.trim()) return [normalizeTime(raw.trim())];
  return [];
}

function parseHM(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return { hh: hh ?? 0, mm: mm ?? 0 };
}

function periodFromTime(time: string) {
  const h = Number(time.split(":")[0] ?? 0);
  if (h >= 5 && h <= 11) return "morning" as const;
  if (h >= 12 && h <= 17) return "day" as const;
  return "evening" as const;
}

function parseHMToMinutes(t: string) {
  const { hh, mm } = parseHM(t);
  return hh * 60 + mm;
}

function isInQuietHours(timeHHMM: string, fromHHMM: string, toHHMM: string) {
  const time = parseHMToMinutes(timeHHMM);
  const from = parseHMToMinutes(fromHHMM);
  const to = parseHMToMinutes(toHHMM);

  if (from === to) return false;
  if (from < to) return time >= from && time < to;
  return time >= from || time < to;
}

type BaseEvent = {
  when: Date;
  dateKey: string;
  time: string;
  groupKey: string;
  medIds: string[];
  items: { medId: string; name: string; dosage: string }[];
};

async function ensureChannels() {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: CHANNEL_DEFAULT,
    name: "Напоминания (лекарства)",
    importance: AndroidImportance.HIGH,
    sound: "med_sound", // <-- ИМЯ ФАЙЛА (без .mp3)
    bypassDnd: true, // ПРОБИВАЕМ "НЕ БЕСПОКОИТЬ"
  });

  await notifee.createChannel({
    id: CHANNEL_SILENT,
    name: "Напоминания (тихо)",
    importance: AndroidImportance.LOW,
  });
}

async function cancelAutoScheduled() {
  const list = await notifee.getTriggerNotifications();
  const ids = list
    .filter((x) => String((x.notification?.data as any)?.auto ?? "") === "1")
    .map((x) => x.notification.id)
    .filter(Boolean);

  await Promise.all(ids.map((id) => notifee.cancelTriggerNotification(id)));
}

async function scheduleWithFallback(
  notification: any,
  timestamp: number,
  useAlarmManager: boolean,
) {
  if (useAlarmManager) {
    try {
      await notifee.createTriggerNotification(notification, {
        type: TriggerType.TIMESTAMP,
        timestamp,
        alarmManager: { allowWhileIdle: true },
      });
      return { ok: true, usedAlarm: true };
    } catch (e: any) {
      console.log("alarmManager trigger failed, fallback:", e);
    }
  }

  try {
    await notifee.createTriggerNotification(notification, {
      type: TriggerType.TIMESTAMP,
      timestamp,
    });
    return { ok: true, usedAlarm: false };
  } catch (e: any) {
    return { ok: false, usedAlarm: false, error: e?.message ?? String(e) };
  }
}

export default function AndroidNotifeeScheduler() {
  const { medications, isDueOnDate, getStatusForDate, statusVersion }: any =
    useMedications();

  const { settings } = useAppSettings();
  const enabled = settings.notificationsEnabled;

  const lastSignatureRef = useRef<string | null>(null);

  const baseEvents = useMemo((): BaseEvent[] => {
    const now = new Date();
    const day0 = startOfDay(now);

    const events: BaseEvent[] = [];

    for (let offset = 0; offset < WINDOW_DAYS; offset++) {
      const day = addDays(day0, offset);
      const dateKey = dateKeyFromDate(day);

      const map = new Map<
        string,
        {
          medIds: string[];
          items: { medId: string; name: string; dosage: string }[];
        }
      >();

      for (const med of medications as Medication[]) {
        if ((med as any).paused) continue;
        if (!isDueOnDate(med, dateKey)) continue;

        const times = getTimes(med);
        for (const t of times) {
          const st = getStatusForDate(dateKey, med.id, t);
          if (st === "taken" || st === "skipped") continue;

          const cur = map.get(t) ?? { medIds: [], items: [] };
          cur.medIds.push(med.id);
          cur.items.push({
            medId: med.id,
            name: med.name,
            dosage: (med as any).dosage || "",
          });
          map.set(t, cur);
        }
      }

      const timesSorted = Array.from(map.keys()).sort((a, b) =>
        a.localeCompare(b),
      );

      for (const t of timesSorted) {
        const entry = map.get(t);
        if (!entry || entry.medIds.length === 0) continue;

        entry.items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

        const { hh, mm } = parseHM(t);
        const when = new Date(day);
        when.setHours(hh, mm, 0, 0);

        events.push({
          when,
          dateKey,
          time: t,
          groupKey: `${dateKey}|${t}`,
          medIds: entry.medIds,
          items: entry.items,
        });
      }
    }

    events.sort((a, b) => a.when.getTime() - b.when.getTime());
    return events;
  }, [medications, isDueOnDate, getStatusForDate]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const run = async () => {
      const debug: any = {
        at: new Date().toISOString(),
        enabled,
        medsCount: Array.isArray(medications) ? medications.length : -1,
        baseEventsCount: baseEvents.length,
        useAlarmManager: false,
        scheduledOk: 0,
        scheduledFail: 0,
        firstEvents: baseEvents.slice(0, 5).map((e) => ({
          when: e.when.toISOString(),
          dateKey: e.dateKey,
          time: e.time,
          meds: e.medIds.length,
        })),
        errors: [] as string[],
      };

      try {
        if (!enabled) {
          await AsyncStorage.setItem(DEBUG_KEY, JSON.stringify(debug, null, 2));
          return;
        }

        await ensureChannels();

        try {
          const st = await (notifee as any).getAlarmPermissionStatus?.();
          debug.alarmPermissionStatus = st ?? "—";
          debug.useAlarmManager = st === "authorized";
        } catch (e: any) {
          debug.alarmPermissionStatus = `err: ${e?.message ?? String(e)}`;
          debug.useAlarmManager = false;
        }

        const signature = JSON.stringify({
          base: baseEvents.map((e) => ({
            when: e.when.toISOString().slice(0, 16),
            dateKey: e.dateKey,
            time: e.time,
            medIds: e.medIds,
          })),
          settings: {
            notificationsEnabled: settings.notificationsEnabled,
            quietHoursEnabled: settings.quietHoursEnabled,
            quietFrom: settings.quietFrom,
            quietTo: settings.quietTo,
          },
        });

        if (lastSignatureRef.current === signature) {
          debug.skippedBecause = "same-signature";
          await AsyncStorage.setItem(DEBUG_KEY, JSON.stringify(debug, null, 2));
          return;
        }
        lastSignatureRef.current = signature;

        await cancelAutoScheduled();

        const now = Date.now();

        for (const ev of baseEvents) {
          if (ev.when.getTime() <= now + 5000) continue;

          const p = periodFromTime(ev.time);
          const title = `Приём таблеток (${periodLabel(p)})`;

          const doses = ev.items.map((it) => ({
            medId: it.medId,
            name: it.name,
            dosage: it.dosage,
            time: ev.time,
          }));

          const lines = doses.slice(0, 6).map((d) => {
            const dosage = d.dosage ? ` (${d.dosage})` : "";
            return `${d.name}${dosage}`;
          });

          const inQuiet =
            settings.quietHoursEnabled &&
            isInQuietHours(ev.time, settings.quietFrom, settings.quietTo);

          const channelId = inQuiet ? CHANNEL_SILENT : CHANNEL_DEFAULT;

          const id = `auto:${ev.groupKey}`;

          const data: Record<string, string> = {
            kind: UI_KIND,
            auto: "1",
            groupKey: ev.groupKey,
            dateKey: ev.dateKey,
            time: ev.time,
            displayTime: ev.time,
            medIdsJson: JSON.stringify(ev.medIds),
            dosesJson: JSON.stringify(doses),
          };

          const res = await scheduleWithFallback(
            {
              id,
              title,
              body: `${ev.time} • ${ev.items.length} шт.`,
              data,
              android: {
                channelId,
                // ЕСЛИ КАНАЛ НЕ ТИХИЙ, ТО СТАВИМ СВОЮ МЕЛОДИЮ
                sound: channelId === CHANNEL_DEFAULT ? "med_sound" : undefined,
                category: AndroidCategory.ALARM,
                importance: AndroidImportance.HIGH,
                smallIcon: "ic_launcher",
                fullScreenAction: { id: "OPEN", launchActivity: "default" },
                pressAction: { id: "OPEN", launchActivity: "default" },
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
            ev.when.getTime(),
            debug.useAlarmManager,
          );

          if (res.ok) debug.scheduledOk += 1;
          else {
            debug.scheduledFail += 1;
            debug.errors.push(
              `id=${id} when=${ev.when.toISOString()} alarm=${String(res.usedAlarm)} err=${res.error}`,
            );
          }
        }

        await AsyncStorage.setItem(DEBUG_KEY, JSON.stringify(debug, null, 2));
      } catch (e: any) {
        debug.fatal = e?.message ?? String(e);
        await AsyncStorage.setItem(DEBUG_KEY, JSON.stringify(debug, null, 2));
      }
    };

    run();
  }, [
    enabled,
    medications,
    baseEvents,
    statusVersion,
    settings.notificationsEnabled,
    settings.quietHoursEnabled,
    settings.quietFrom,
    settings.quietTo,
  ]);

  return null;
}
