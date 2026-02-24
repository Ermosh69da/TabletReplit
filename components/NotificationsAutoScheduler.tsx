import { useEffect, useRef } from "react";
import { AppState, Platform, ToastAndroid } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";

import {
  useMedications,
  type Medication,
  periodLabel,
} from "./MedicationsContext";
import { useAppSettings } from "./AppSettingsContext";

type NotifModule = typeof import("expo-notifications");

const CATEGORY_ID = "MED_REMINDER";
const ACTION_TAKE_ALL = "TAKE_ALL";
const ACTION_SNOOZE_15 = "SNOOZE_15";
const ACTION_OPEN_HOME = "OPEN_HOME";

const WINDOW_DAYS = 5;

// ✅ единый kind для UI-карточки
const UI_KIND = "MED_REMINDER";

// ✅ новые каналы (если старый канал отключали в настройках — уведомлений может не быть)
const CHANNEL_DEFAULT = "med_default";
const CHANNEL_SILENT = "med_silent";

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
      new Set(
        anyM.times
          .map((t: any) => normalizeTime(String(t).trim()))
          .filter(Boolean),
      ),
    ).sort();
  }

  const raw = typeof anyM.time === "string" ? anyM.time : "";
  const matches = raw.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
  const normalized = matches.map(normalizeTime).filter(Boolean);
  if (normalized.length > 0) return Array.from(new Set(normalized)).sort();
  if (raw.trim()) return [normalizeTime(raw.trim())];
  return [];
}

function periodFromTime(time: string) {
  const h = Number(time.split(":")[0] ?? 0);
  if (h >= 5 && h <= 11) return "morning" as const;
  if (h >= 12 && h <= 17) return "day" as const;
  return "evening" as const;
}

function parseHM(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return { hh: hh ?? 0, mm: mm ?? 0 };
}

function hhmmFromDate(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseHMToMinutes(t: string) {
  const a = parseHM(t);
  return a.hh * 60 + a.mm;
}

function isInQuietHours(timeHHMM: string, fromHHMM: string, toHHMM: string) {
  const time = parseHMToMinutes(timeHHMM);
  const from = parseHMToMinutes(fromHHMM);
  const to = parseHMToMinutes(toHHMM);

  if (from === to) return false;

  if (from < to) return time >= from && time < to;
  return time >= from || time < to;
}

function ruMedWord(n: number) {
  const x = n % 100;
  const y = n % 10;
  if (x >= 11 && x <= 14) return "лекарств";
  if (y === 1) return "лекарство";
  if (y >= 2 && y <= 4) return "лекарства";
  return "лекарств";
}

function buildMedsText(
  list: { medId: string; name: string; dosage: string }[],
) {
  const max = 4;
  const shown = list.slice(0, max).map((x) => `${x.name} ${x.dosage}`.trim());
  const rest = list.length - shown.length;
  const main =
    rest > 0 ? `${shown.join(", ")}, + ещё ${rest}` : shown.join(", ");

  const prefix =
    list.length > 1 ? `${list.length} ${ruMedWord(list.length)}: ` : "";
  return prefix + main;
}

type BaseEvent = {
  when: Date;
  dateKey: string;
  time: string; // логическое время дозы
  medIds: string[];
  items: { medId: string; name: string; dosage: string }[];
};

export default function NotificationsAutoScheduler() {
  const isExpoGo = (Constants as any)?.executionEnvironment === "storeClient";

  const {
    medications,
    isDueOnDate,
    getStatusForDate,
    setStatusForDate,
    statusVersion,
  } = useMedications();

  const { settings } = useAppSettings();

  const modRef = useRef<NotifModule | null>(null);
  const initDoneRef = useRef(false);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const enabled = settings.notificationsEnabled;

  const lastPlanSignatureRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const inFlightRef = useRef(false);
  const rerunRequestedRef = useRef(false);

  const ensureAndroidChannels = async (m: NotifModule) => {
    if (Platform.OS !== "android") return;

    await m.setNotificationChannelAsync(CHANNEL_DEFAULT, {
      name: "Напоминания (лекарства)",
      importance: m.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lightColor: "#38BDF8",
      lockscreenVisibility: m.AndroidNotificationVisibility.PUBLIC,
    });

    await m.setNotificationChannelAsync(CHANNEL_SILENT, {
      name: "Напоминания (тихо)",
      importance: m.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: [],
      enableVibrate: false as any,
      lightColor: "#38BDF8",
      lockscreenVisibility: m.AndroidNotificationVisibility.PUBLIC,
    });
  };

  const ensureCategory = async (m: NotifModule) => {
    await m.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: ACTION_TAKE_ALL,
        buttonTitle: "Принять всё",
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_SNOOZE_15,
        buttonTitle: "Отложить 15 мин",
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_OPEN_HOME,
        buttonTitle: "Открыть",
        options: { opensAppToForeground: true },
      },
    ]);
  };

  const cancelAutoScheduled = async (m: NotifModule) => {
    const all = await m.getAllScheduledNotificationsAsync();
    const ids = all
      .filter((x) => (x as any)?.content?.data?.auto === true)
      .map((x) => x.identifier);

    await Promise.all(ids.map((id) => m.cancelScheduledNotificationAsync(id)));
  };

  const cancelByGroupKey = async (m: NotifModule, groupKey: string) => {
    const all = await m.getAllScheduledNotificationsAsync();
    const ids = all
      .filter(
        (x) => String((x as any)?.content?.data?.groupKey ?? "") === groupKey,
      )
      .map((x) => x.identifier);

    await Promise.all(ids.map((id) => m.cancelScheduledNotificationAsync(id)));
  };

  function buildBaseEventsForWindow(): BaseEvent[] {
    const now = new Date();
    const day0 = startOfDay(now);

    const baseEvents: BaseEvent[] = [];

    for (let offset = 0; offset < WINDOW_DAYS; offset++) {
      const day = addDays(day0, offset);
      const key = dateKeyFromDate(day);

      const map = new Map<
        string,
        {
          medIds: string[];
          items: { medId: string; name: string; dosage: string }[];
        }
      >();

      for (const med of medications) {
        if (!isDueOnDate(med, key)) continue;

        const times = getTimes(med);
        for (const t of times) {
          const st = getStatusForDate(key, med.id, t);
          if (st !== "pending") continue;

          const cur = map.get(t) ?? { medIds: [], items: [] };
          cur.medIds.push(med.id);
          cur.items.push({
            medId: med.id,
            name: med.name,
            dosage: med.dosage || "",
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

        entry.medIds.sort((a, b) => a.localeCompare(b));
        entry.items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

        const { hh, mm } = parseHM(t);
        const when = new Date(day);
        when.setHours(hh, mm, 0, 0);

        baseEvents.push({
          when,
          dateKey: key,
          time: t,
          medIds: entry.medIds,
          items: entry.items,
        });
      }
    }

    baseEvents.sort((a, b) => a.when.getTime() - b.when.getTime());
    return baseEvents;
  }

  function computePlanSignature(baseEvents: BaseEvent[]) {
    const s = settings;
    const payload = {
      windowDays: WINDOW_DAYS,
      settings: {
        notificationsEnabled: s.notificationsEnabled,
        quietHoursEnabled: s.quietHoursEnabled,
        quietFrom: s.quietFrom,
        quietTo: s.quietTo,
        repeatEnabled: s.repeatEnabled,
        repeatMinutes: s.repeatMinutes,
        repeatCount: s.repeatCount,
      },
      base: baseEvents.map((e) => ({
        when: e.when.toISOString().slice(0, 16),
        dateKey: e.dateKey,
        time: e.time,
        medIds: e.medIds,
        items: e.items,
      })),
    };

    return JSON.stringify(payload);
  }

  const scheduleWindow = async () => {
    if (Platform.OS === "web") return;
    if (isExpoGo) return;
    if (!enabled) return;

    const m = modRef.current;
    if (!m) return;

    const perm = await m.getPermissionsAsync();
    if (perm.status !== "granted") return;

    await ensureAndroidChannels(m);
    await ensureCategory(m);

    const baseEvents = buildBaseEventsForWindow();
    const signature = computePlanSignature(baseEvents);

    if (lastPlanSignatureRef.current === signature) return;
    lastPlanSignatureRef.current = signature;

    await cancelAutoScheduled(m);

    const now = new Date();
    const day0 = startOfDay(now);
    const windowEnd = addDays(day0, WINDOW_DAYS + 1);

    const DATE = (m as any).SchedulableTriggerInputTypes?.DATE ?? "date";

    for (let i = 0; i < baseEvents.length; i++) {
      const ev = baseEvents[i];
      const nextWhen = baseEvents[i + 1]?.when ?? windowEnd;

      const p = periodFromTime(ev.time);
      const title = `Приём таблеток (${periodLabel(p)})`;
      const medsText = buildMedsText(ev.items);
      const body = `${ev.time} • ${medsText}`;

      const groupKey = `${ev.dateKey}|${ev.time}`;

      const inQuiet =
        settings.quietHoursEnabled &&
        isInQuietHours(ev.time, settings.quietFrom, settings.quietTo);

      const channelId =
        Platform.OS === "android"
          ? inQuiet
            ? CHANNEL_SILENT
            : CHANNEL_DEFAULT
          : undefined;

      const doses = ev.items.map((it) => ({
        medId: it.medId,
        name: it.name,
        dosage: it.dosage,
        time: ev.time, // логическое время дозы
      }));

      if (ev.when.getTime() > now.getTime() + 5000) {
        await m.scheduleNotificationAsync({
          content: {
            title,
            body,
            categoryIdentifier: CATEGORY_ID,
            data: {
              kind: UI_KIND,
              auto: true,
              groupKey,
              dateKey: ev.dateKey,
              time: ev.time, // логическое
              displayTime: ev.time, // UI
              medIds: ev.medIds,
              doses,
            },
            ...(Platform.OS === "android" ? { channelId } : {}),
            ...(inQuiet && Platform.OS !== "android" ? { sound: null } : {}),
          },
          trigger: { type: DATE, date: ev.when } as any,
        });
      }

      if (settings.repeatEnabled) {
        const repeatMinutes = Math.max(1, Number(settings.repeatMinutes) || 10);
        const repeatCount = Math.max(0, Number(settings.repeatCount) || 0);

        for (let k = 1; k <= repeatCount; k++) {
          const repeatAt = new Date(
            ev.when.getTime() + k * repeatMinutes * 60_000,
          );
          if (repeatAt.getTime() >= nextWhen.getTime()) break;
          if (repeatAt.getTime() <= now.getTime() + 5000) continue;

          const repeatTime = hhmmFromDate(repeatAt);

          const inQuietRepeat =
            settings.quietHoursEnabled &&
            isInQuietHours(repeatTime, settings.quietFrom, settings.quietTo);

          const channelIdRepeat =
            Platform.OS === "android"
              ? inQuietRepeat
                ? CHANNEL_SILENT
                : CHANNEL_DEFAULT
              : undefined;

          await m.scheduleNotificationAsync({
            content: {
              title: `${title} (повтор)`,
              body: `${repeatTime} • ${medsText}`,
              categoryIdentifier: CATEGORY_ID,
              data: {
                kind: UI_KIND,
                auto: true,
                groupKey,
                dateKey: ev.dateKey,
                time: ev.time, // логическое остаётся
                displayTime: repeatTime, // UI время повтора
                medIds: ev.medIds,
                repeatIndex: k,
                doses,
              },
              ...(Platform.OS === "android"
                ? { channelId: channelIdRepeat }
                : {}),
              ...(inQuietRepeat && Platform.OS !== "android"
                ? { sound: null }
                : {}),
            },
            trigger: { type: DATE, date: repeatAt } as any,
          });
        }
      }
    }
  };

  const requestSchedule = () => {
    if (Platform.OS === "web") return;
    if (isExpoGo) return;

    if (inFlightRef.current) {
      rerunRequestedRef.current = true;
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      inFlightRef.current = true;
      try {
        await scheduleWindow();
      } catch (e) {
        console.log("scheduleWindow error:", e);
      } finally {
        inFlightRef.current = false;

        if (rerunRequestedRef.current) {
          rerunRequestedRef.current = false;
          requestSchedule();
        }
      }
    }, 300);
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    if (isExpoGo) return;

    let subResp: any;
    let subApp: any;
    let mounted = true;

    (async () => {
      try {
        const mod = await import("expo-notifications");
        if (!mounted) return;
        modRef.current = mod;

        // ✅ ВАЖНО:
        // ВСЕГДА разрешаем системное уведомление.
        // (Иначе в dev-client/живом фоне оно легко подавляется и пропадает из шторки.)
        mod.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldShowAlert: true as any,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        const perm = await mod.getPermissionsAsync();
        if (perm.status !== "granted") {
          try {
            await mod.requestPermissionsAsync();
          } catch {}
        }

        await ensureAndroidChannels(mod);
        await ensureCategory(mod);

        subResp = mod.addNotificationResponseReceivedListener(async (resp) => {
          try {
            const action = resp.actionIdentifier;
            const data: any = resp.notification.request.content.data ?? {};

            const kind = String(data.kind ?? "");
            if (!(kind === UI_KIND || kind.startsWith("med-"))) return;

            const dateKey = String(data.dateKey ?? "");
            const time = String(data.time ?? ""); // логическое
            const groupKey = String(data.groupKey ?? "");
            const medIds: string[] = Array.isArray(data.medIds)
              ? data.medIds
              : [];

            if (action === ACTION_TAKE_ALL) {
              for (const id of medIds) {
                setStatusForDate(dateKey, id, "taken", time);
              }

              try {
                await cancelByGroupKey(mod, groupKey);
              } catch {}

              try {
                await mod.dismissNotificationAsync(
                  resp.notification.request.identifier,
                );
              } catch {}

              requestSchedule();
              return;
            }

            if (action === ACTION_SNOOZE_15) {
              const TIME_INTERVAL =
                (mod as any).SchedulableTriggerInputTypes?.TIME_INTERVAL ??
                "timeInterval";

              const now2 = new Date();
              const snoozeAt = new Date(now2.getTime() + 15 * 60 * 1000);
              const snoozeTime = hhmmFromDate(snoozeAt);

              const s = settingsRef.current;

              const inQuiet =
                s.quietHoursEnabled &&
                isInQuietHours(snoozeTime, s.quietFrom, s.quietTo);

              const channelId =
                Platform.OS === "android"
                  ? inQuiet
                    ? CHANNEL_SILENT
                    : CHANNEL_DEFAULT
                  : undefined;

              try {
                await cancelByGroupKey(mod, groupKey);
              } catch {}

              const prevBody = String(
                resp.notification.request.content.body ?? "",
              );
              const medsPart = prevBody.includes("•")
                ? prevBody.split("•").slice(1).join("•").trim()
                : prevBody;
              const snoozeBody = medsPart
                ? `${snoozeTime} • ${medsPart}`
                : `${snoozeTime}`;

              await mod.scheduleNotificationAsync({
                content: {
                  title:
                    (resp.notification.request.content.title ??
                      "Приём таблеток") + " (отложено)",
                  body: snoozeBody,
                  categoryIdentifier: CATEGORY_ID,
                  data: {
                    ...data,
                    kind: UI_KIND,
                    auto: false,
                    groupKey,
                    time, // логическое
                    displayTime: snoozeTime, // UI
                    snoozeTime,
                  },
                  ...(Platform.OS === "android" ? { channelId } : {}),
                  ...(inQuiet && Platform.OS !== "android"
                    ? { sound: null }
                    : {}),
                },
                trigger: {
                  type: TIME_INTERVAL,
                  seconds: 15 * 60,
                  repeats: false,
                } as any,
              });

              if (Platform.OS === "android") {
                ToastAndroid.show("Отложено на 15 минут", ToastAndroid.SHORT);
              }

              try {
                await mod.dismissNotificationAsync(
                  resp.notification.request.identifier,
                );
              } catch {}
              return;
            }

            if (
              action === ACTION_OPEN_HOME ||
              action === mod.DEFAULT_ACTION_IDENTIFIER
            ) {
              router.push("/");
              return;
            }
          } catch (e) {
            console.log("notification response handler error:", e);
          }
        });

        subApp = AppState.addEventListener("change", (st) => {
          if (st === "active") requestSchedule();
        });

        requestSchedule();
      } catch (e) {
        console.log("NotificationsAutoScheduler init error:", e);
      }
    })();

    return () => {
      mounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      try {
        subResp?.remove?.();
      } catch {}
      try {
        subApp?.remove?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    requestSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    medications,
    statusVersion,
    settings.notificationsEnabled,
    settings.quietHoursEnabled,
    settings.quietFrom,
    settings.quietTo,
    settings.repeatEnabled,
    settings.repeatMinutes,
    settings.repeatCount,
  ]);

  return null;
}
