import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  Switch,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useMedications } from "../../components/MedicationsContext";
import { useAppSettings } from "../../components/AppSettingsContext";

const COLORS = {
  bg: "#050B18",
  surface: "#0E1629",
  surface2: "#0B1220",
  border: "rgba(148,163,184,0.14)",

  title: "#F8FAFC",
  muted: "#94A3B8",
  muted2: "#64748B",

  blue: "#38BDF8",
  green: "#34D399",
  orange: "#F59E0B",
  amber: "#FBBF24",
  red: "#EF4444",
};

const SCHED_DEBUG_KEY = "notifee_scheduler_debug_v1";

type NotifeeMod = typeof import("@notifee/react-native");
type NotifeeInstance = NotifeeMod["default"];
type ExpoNotifModule = typeof import("expo-notifications");
type UpdatesModule = typeof import("expo-updates");

function dateKeyFromDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function keyDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKeyFromDate(d);
}

function timeOptions(stepMinutes = 30) {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

function HeaderFade() {
  return (
    <View pointerEvents="none" style={styles.headerFade}>
      <View style={[styles.fadeRow, { opacity: 0.18 }]} />
      <View style={[styles.fadeRow, { opacity: 0.12 }]} />
      <View style={[styles.fadeRow, { opacity: 0.08 }]} />
      <View style={[styles.fadeRow, { opacity: 0.04 }]} />
    </View>
  );
}

type SelectSheetItem = { key: string; label: string; rightText?: string };

function SelectSheet({
  visible,
  title,
  subtitle,
  items,
  selectedKey,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  items: SelectSheetItem[];
  selectedKey?: string | null;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet} pointerEvents="auto">
          <Text style={styles.sheetTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}

          <ScrollView
            style={{ maxHeight: 340 }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((it) => {
              const active = it.key === selectedKey;
              return (
                <TouchableOpacity
                  key={it.key}
                  style={[styles.sheetItem, active && styles.sheetItemActive]}
                  activeOpacity={0.85}
                  onPress={() => onSelect(it.key)}
                >
                  <Text style={styles.sheetItemText}>{it.label}</Text>
                  <View style={styles.sheetItemRight}>
                    {!!it.rightText && (
                      <Text style={styles.sheetItemRightText}>
                        {it.rightText}
                      </Text>
                    )}
                    {active ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={COLORS.blue}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.sheetCancel}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetCancelText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ===== Permission UI =====
type NotifStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unsupported"
  | "expo-go"
  | "loading";

type PermissionView = { status: NotifStatus };

function permLabel(p: NotifStatus) {
  if (p === "granted") return "Разрешено";
  if (p === "denied") return "Запрещено";
  if (p === "undetermined") return "Не запрошено";
  if (p === "unsupported") return "Не поддерживается (Web)";
  if (p === "expo-go") return "Недоступно в Expo Go";
  if (p === "loading") return "Проверяем…";
  return String(p);
}

function permColor(p: NotifStatus) {
  if (p === "granted") return COLORS.green;
  if (p === "denied") return COLORS.red;
  if (p === "undetermined") return COLORS.amber;
  return COLORS.muted;
}

function short(s: any, n = 140) {
  const t = String(s ?? "");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function formatWhenFromNotifeeTrigger(trigger: any) {
  const ts = trigger?.timestamp;
  if (typeof ts === "number") {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString("ru-RU");
  }
  try {
    return JSON.stringify(trigger);
  } catch {
    return String(trigger);
  }
}

function safeJsonParse<T>(s: any, fallback: T): T {
  try {
    if (typeof s !== "string") return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

type UpdatesInfo = {
  ok: boolean;
  error?: string;
  updateId?: string | null;
  runtimeVersion?: string | null;
  channel?: string | null;
  branch?: string | null;
  isEmbeddedLaunch?: boolean | null;
  createdAt?: string | null;
};

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { medications, todayProgress, getHistoryEntries } = useMedications();

  const {
    settings,
    setNotificationsEnabled,
    setQuietHoursEnabled,
    setQuietFrom,
    setQuietTo,
    setRepeatEnabled,
    setRepeatMinutes,
    setRepeatCount,
  } = useAppSettings();

  const {
    notificationsEnabled,
    quietHoursEnabled,
    quietFrom,
    quietTo,
    repeatEnabled,
    repeatMinutes,
    repeatCount,
  } = settings;

  const [pickQuietFromOpen, setPickQuietFromOpen] = useState(false);
  const [pickQuietToOpen, setPickQuietToOpen] = useState(false);
  const [pickRepeatOpen, setPickRepeatOpen] = useState(false);
  const [pickRepeatCountOpen, setPickRepeatCountOpen] = useState(false);

  const times = useMemo(() => timeOptions(30), []);
  const repeatOptions = useMemo(
    () =>
      [5, 10, 15, 30, 60].map((n) => ({ key: String(n), label: `${n} минут` })),
    [],
  );

  const repeatCountOptions = useMemo(() => {
    const arr = [0, 1, 2, 3, 4, 5, 10];
    return arr.map((n) => ({
      key: String(n),
      label: n === 0 ? "0" : `${n}`,
      rightText:
        n === 0
          ? "не повторять"
          : n === 1
            ? "повтор"
            : n <= 4
              ? "повтора"
              : "повторов",
    }));
  }, []);

  const isExpoGo = (Constants as any)?.executionEnvironment === "storeClient";

  // ===== Notifee =====
  const [nf, setNf] = useState<NotifeeInstance | null>(null);
  const [nfMod, setNfMod] = useState<NotifeeMod | null>(null);
  const [perm, setPerm] = useState<PermissionView>({ status: "loading" });

  // ===== Updates =====
  const [Updates, setUpdates] = useState<UpdatesModule | null>(null);
  const [updatesInfo, setUpdatesInfo] = useState<UpdatesInfo>({
    ok: false,
    error: "loading",
  });
  const [updatesBusy, setUpdatesBusy] = useState(false);

  // ===== Diagnostics =====
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagText, setDiagText] = useState<string>("—");
  const [diagLoading, setDiagLoading] = useState(false);

  const [lastInfo, setLastInfo] = useState<string | null>(null);

  const last7 = useMemo(() => {
    const to = dateKeyFromDate(new Date());
    const from = keyDaysAgo(6);

    const entries = getHistoryEntries({ from, to });
    let taken = 0;
    let skipped = 0;

    const byDay: Record<string, { taken: number; skipped: number }> = {};
    for (const e of entries) {
      if (!byDay[e.date]) byDay[e.date] = { taken: 0, skipped: 0 };
      if (e.status === "taken") {
        taken += 1;
        byDay[e.date].taken += 1;
      } else {
        skipped += 1;
        byDay[e.date].skipped += 1;
      }
    }

    const total = taken + skipped;
    const percent = total === 0 ? 0 : Math.round((taken / total) * 100);

    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const day = keyDaysAgo(i);
      const st = byDay[day];
      if (!st) break;
      if (st.taken > 0 && st.skipped === 0) streak += 1;
      else break;
    }

    return { taken, skipped, total, percent, streak };
  }, [getHistoryEntries]);

  // ===== expo-updates helpers =====
  const refreshUpdatesInfo = async (U?: UpdatesModule | null) => {
    const mod = U ?? Updates;
    if (!mod) return;

    try {
      const manifest: any = (mod as any).manifest ?? null;
      const metadata: any = manifest?.metadata ?? null;

      const updateId = (mod as any).updateId ?? manifest?.id ?? null;
      const runtimeVersion =
        (mod as any).runtimeVersion ?? manifest?.runtimeVersion ?? null;

      const channel =
        (mod as any).channel ??
        metadata?.channelName ??
        metadata?.channel ??
        null;

      const branch = metadata?.branchName ?? metadata?.branch ?? null;

      const createdAtRaw = (mod as any).createdAt ?? null;
      const createdAt = createdAtRaw
        ? new Date(createdAtRaw).toLocaleString("ru-RU")
        : null;

      const isEmbeddedLaunch =
        typeof (mod as any).isEmbeddedLaunch === "boolean"
          ? (mod as any).isEmbeddedLaunch
          : null;

      setUpdatesInfo({
        ok: true,
        updateId,
        runtimeVersion,
        channel,
        branch,
        createdAt,
        isEmbeddedLaunch,
      });
    } catch (e: any) {
      setUpdatesInfo({ ok: false, error: e?.message ?? String(e) });
    }
  };

  const checkForUpdates = async () => {
    if (!Updates) return;
    setUpdatesBusy(true);
    try {
      const res = await Updates.checkForUpdateAsync();
      setLastInfo(res.isAvailable ? "Есть обновление" : "Обновлений нет");
    } catch (e: any) {
      setLastInfo(`checkForUpdateAsync: ${e?.message ?? String(e)}`);
    } finally {
      setUpdatesBusy(false);
      refreshUpdatesInfo();
    }
  };

  const fetchAndReload = async () => {
    if (!Updates) return;
    setUpdatesBusy(true);
    try {
      const res = await Updates.fetchUpdateAsync();
      setLastInfo(res.isNew ? "Скачано новое. Перезапуск…" : "Ничего нового");
      await Updates.reloadAsync();
    } catch (e: any) {
      setLastInfo(`fetch/reload: ${e?.message ?? String(e)}`);
    } finally {
      setUpdatesBusy(false);
      refreshUpdatesInfo();
    }
  };

  // ===== Notifee permission helpers =====
  const refreshPermissions = async (
    inst?: NotifeeInstance | null,
    mod?: NotifeeMod | null,
  ) => {
    const nfi = inst ?? nf;
    const nfm = mod ?? nfMod;

    try {
      if (Platform.OS === "web") return setPerm({ status: "unsupported" });
      if (isExpoGo) return setPerm({ status: "expo-go" });
      if (!nfi || !nfm) return;

      const s = await nfi.getNotificationSettings();
      const AS = nfm.AuthorizationStatus;

      const st = s.authorizationStatus;
      if (st === AS.AUTHORIZED || st === AS.PROVISIONAL)
        setPerm({ status: "granted" });
      else if (st === AS.DENIED) setPerm({ status: "denied" });
      else setPerm({ status: "undetermined" });
    } catch {
      setPerm({ status: "denied" });
    }
  };

  const requestPermissions = async () => {
    if (!nf) return;
    try {
      await nf.requestPermission();
      await refreshPermissions();
    } catch {
      setPerm({ status: "denied" });
    }
  };

  const openAppNotifSettings = async () => {
    if (!nf) return;
    try {
      await nf.openNotificationSettings();
    } catch {
      Linking.openSettings?.();
    }
  };

  const openDefaultChannelSettings = async () => {
    if (!nf) return;
    try {
      // Открываем настройки именно канала V3
      await nf.openChannelSettings("med_default_v3");
    } catch {
      Linking.openSettings?.();
    }
  };

  const openAlarmSettings = async () => {
    if (!nf) return;
    try {
      await nf.openAlarmPermissionSettings();
    } catch {}
  };

  // ===== Notifee test =====
  const sendTestNotification = async () => {
    if (Platform.OS === "web") return;

    if (isExpoGo) {
      setLastInfo("В Expo Go Notifee не работает. Нужен preview APK.");
      return;
    }
    if (!nf || !nfMod) return;

    try {
      await nf.requestPermission();
      await refreshPermissions();

      if (perm.status !== "granted") {
        setLastInfo("Нет разрешения на уведомления (по Notifee)");
        return;
      }

      // СОЗДАНИЕ КАНАЛА V3
      await nf.createChannel({
        id: "med_default_v3",
        name: "Напоминания (лекарства)",
        importance: nfMod.AndroidImportance.HIGH,
        sound: "med_sound", // <-- ИМЯ ФАЙЛА
        bypassDnd: true, // ПРОБИВАЕМ "НЕ БЕСПОКОИТЬ"
      });

      const nowId = `test_now_${Date.now()}`;
      const doses = [
        { medId: "test", name: "Тест", dosage: "1 таб", time: "00:00" },
      ];
      const medIds = ["test"];

      // TEST NOW
      await nf.displayNotification({
        id: nowId,
        title: "TEST NOW (должно появиться сразу)",
        body: "Если не появилось — выключен канал/уведомления",
        data: {
          kind: "MED_REMINDER",
          auto: "0",
          groupKey: "test|00:00",
          dateKey: dateKeyFromDate(new Date()),
          time: "00:00",
          displayTime: "00:00",
          medIdsJson: JSON.stringify(medIds),
          dosesJson: JSON.stringify(doses),
        },
        android: {
          channelId: "med_default_v3", // КАНАЛ V3
          sound: "med_sound", // СВОЯ МЕЛОДИЯ
          importance: nfMod.AndroidImportance.HIGH,
          smallIcon: "ic_launcher",
        },
      });

      // TEST TRIGGER
      const trigId = `test_trig_${Date.now()}`;
      await nf.createTriggerNotification(
        {
          id: trigId,
          title: "TEST TRIGGER (через 5 сек)",
          body: "Если NOW есть, а TRIGGER нет — проблема в exact alarms/планировщике",
          data: {
            kind: "MED_REMINDER",
            auto: "0",
            groupKey: "test|00:00",
            dateKey: dateKeyFromDate(new Date()),
            time: "00:00",
            displayTime: "00:00",
            medIdsJson: JSON.stringify(medIds),
            dosesJson: JSON.stringify(doses),
          },
          android: {
            channelId: "med_default_v3", // КАНАЛ V3
            sound: "med_sound", // СВОЯ МЕЛОДИЯ
            category: nfMod.AndroidCategory.ALARM,
            importance: nfMod.AndroidImportance.HIGH,
            smallIcon: "ic_launcher",
          },
        },
        {
          type: nfMod.TriggerType.TIMESTAMP,
          timestamp: Date.now() + 5000,
        },
      );

      let alarmStatus: string = "unknown";
      try {
        alarmStatus = String(await nf.getAlarmPermissionStatus());
      } catch {}

      setLastInfo(`Отправлено: NOW + TRIGGER (alarmPerm=${alarmStatus})`);
    } catch (e: any) {
      setLastInfo(`Ошибка теста: ${e?.message ?? String(e)}`);
      console.log("sendTestNotification error:", e);
    }
  };

  const clearLegacyExpoScheduled = async () => {
    if (Platform.OS === "web" || isExpoGo) return;

    try {
      const ExpoN: ExpoNotifModule = await import("expo-notifications");
      const before = await ExpoN.getAllScheduledNotificationsAsync();
      await ExpoN.cancelAllScheduledNotificationsAsync();
      const after = await ExpoN.getAllScheduledNotificationsAsync();
      setLastInfo(
        `Очистили Expo scheduled: было ${before.length}, стало ${after.length}`,
      );
    } catch (e: any) {
      setLastInfo(
        `Не удалось очистить Expo scheduled: ${e?.message ?? String(e)}`,
      );
    }
  };

  // ===== Notifee diagnostics (+ Scheduler debug from AsyncStorage) =====
  const showScheduledDiagnostics = async () => {
    if (Platform.OS === "web") {
      setDiagText("Web не поддерживается для локальных уведомлений.");
      setDiagOpen(true);
      return;
    }
    if (isExpoGo) {
      setDiagText("В Expo Go Notifee не работает. Нужен preview APK.");
      setDiagOpen(true);
      return;
    }
    if (!nf) return;

    setDiagLoading(true);
    try {
      const triggers = await nf.getTriggerNotifications();
      const displayed = await nf.getDisplayedNotifications();

      const medTriggers = triggers.filter(
        (x: any) => (x?.notification?.data as any)?.kind === "MED_REMINDER",
      );

      const autoTriggers = medTriggers.filter((x: any) => {
        const a = String((x?.notification?.data as any)?.auto ?? "");
        return a === "1" || a.toLowerCase() === "true";
      });

      const medDisplayed = displayed.filter(
        (x: any) => (x?.notification?.data as any)?.kind === "MED_REMINDER",
      );

      let alarmStatus: any = null;
      try {
        alarmStatus = await nf.getAlarmPermissionStatus();
      } catch {}

      let chDefault: any = null;
      try {
        // ИЩЕМ КАНАЛ V3 В ДИАГНОСТИКЕ
        chDefault = await nf.getChannel("med_default_v3");
      } catch {}

      let legacyExpoCount: number | null = null;
      try {
        const ExpoN: ExpoNotifModule = await import("expo-notifications");
        legacyExpoCount = (await ExpoN.getAllScheduledNotificationsAsync())
          .length;
      } catch {}

      // ✅ scheduler debug from AsyncStorage
      let schedDebug: string | null = null;
      try {
        schedDebug = await AsyncStorage.getItem(SCHED_DEBUG_KEY);
      } catch {}

      const lines: string[] = [];
      lines.push(`alarmPermissionStatus: ${String(alarmStatus ?? "—")}`);
      lines.push(
        `channel med_default_v3: ${chDefault ? JSON.stringify(chDefault) : "—"}`, // Имя V3
      );
      lines.push("—");
      lines.push(`NOTIFEE triggers (all): ${triggers.length}`);
      lines.push(`NOTIFEE MED_REMINDER scheduled: ${medTriggers.length}`);
      lines.push(`NOTIFEE AUTO scheduled: ${autoTriggers.length}`);
      lines.push(`NOTIFEE displayed MED_REMINDER: ${medDisplayed.length}`);
      if (legacyExpoCount !== null)
        lines.push(`EXPO legacy scheduled: ${legacyExpoCount}`);
      lines.push("—");

      const sorted = [...medTriggers].sort((a: any, b: any) => {
        const ta = Number(a?.trigger?.timestamp ?? 0);
        const tb = Number(b?.trigger?.timestamp ?? 0);
        return ta - tb;
      });

      for (const x of sorted.slice(0, 20)) {
        const n = x.notification;
        const d: any = n?.data ?? {};
        const when = formatWhenFromNotifeeTrigger(x.trigger);

        const doses = safeJsonParse<any[]>(d.dosesJson, []);
        const count = doses.length;

        lines.push(
          [
            `id=${String(n?.id ?? "—")}`,
            `when=${when}`,
            `auto=${String(d.auto ?? "—")}`,
            `dateKey=${String(d.dateKey ?? "—")}`,
            `time=${String(d.time ?? "—")}`,
            `displayTime=${String(d.displayTime ?? "—")}`,
            `groupKey=${String(d.groupKey ?? "—")}`,
            `count=${count}`,
          ].join(" | "),
        );
        lines.push(`  title: ${short(n?.title, 120)}`);
        lines.push(`  body: ${short(n?.body, 140)}`);
        lines.push("");
      }

      lines.push("—");
      lines.push("SCHEDULER DEBUG (last run):");
      lines.push(schedDebug ? schedDebug : "— (no debug saved yet)");

      setDiagText(lines.join("\n"));
      setDiagOpen(true);
    } catch (e: any) {
      setDiagText(`Ошибка диагностики: ${e?.message ?? String(e)}`);
      setDiagOpen(true);
    } finally {
      setDiagLoading(false);
    }
  };

  // init Notifee + expo-updates
  useEffect(() => {
    if (Platform.OS === "web") {
      setPerm({ status: "unsupported" });
      return;
    }
    if (isExpoGo) {
      setPerm({ status: "expo-go" });
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const mod = await import("@notifee/react-native");
        if (!mounted) return;

        setNf(mod.default);
        setNfMod(mod);
        await refreshPermissions(mod.default, mod);
      } catch (e) {
        console.log("Notifee init error:", e);
        setPerm({ status: "denied" });
      }

      try {
        const up = await import("expo-updates");
        if (!mounted) return;
        setUpdates(up);
        await refreshUpdatesInfo(up);
      } catch {
        setUpdatesInfo({
          ok: false,
          error:
            "expo-updates не доступен. Если не установлен: `npx expo install expo-updates` и пересобрать APK.",
        });
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpoGo]);

  const canUseNotifications =
    perm.status === "granted" && notificationsEnabled && !isExpoGo;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Профиль</Text>
      </View>

      <HeaderFade />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 },
        ]}
      >
        {/* STATS */}
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart-outline" size={18} color={COLORS.blue} />
          <Text style={styles.sectionTitle}>Статистика</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Сегодня</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{todayProgress.percent}%</Text>
              <Text style={styles.statLabel}>прогресс</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {todayProgress.taken}/{todayProgress.totalForProgress}
              </Text>
              <Text style={styles.statLabel}>принято</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.orange }]}>
                {todayProgress.skipped}
              </Text>
              <Text style={styles.statLabel}>пропущено</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.cardTitle}>Последние 7 дней</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{last7.percent}%</Text>
              <Text style={styles.statLabel}>принятие</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.green }]}>
                {last7.taken}
              </Text>
              <Text style={styles.statLabel}>принято</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.orange }]}>
                {last7.skipped}
              </Text>
              <Text style={styles.statLabel}>пропущено</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.noteText}>
            Лекарств в списке:{" "}
            <Text style={{ fontWeight: "900", color: COLORS.title }}>
              {medications.length}
            </Text>
          </Text>
        </View>

        {/* NOTIFICATIONS */}
        <View style={styles.sectionHeader}>
          <Ionicons
            name="notifications-outline"
            size={18}
            color={COLORS.blue}
          />
          <Text style={styles.sectionTitle}>Уведомления</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={permColor(perm.status)}
            />
            <Text style={styles.infoRowText}>
              Разрешение:{" "}
              <Text
                style={{ color: permColor(perm.status), fontWeight: "900" }}
              >
                {permLabel(perm.status)}
              </Text>
            </Text>

            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() => refreshPermissions()}
              activeOpacity={0.85}
            >
              <Text style={styles.smallBtnText}>Обновить</Text>
            </TouchableOpacity>
          </View>

          {perm.status !== "granted" &&
          perm.status !== "unsupported" &&
          perm.status !== "expo-go" ? (
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.85}
              onPress={requestPermissions}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={COLORS.blue}
              />
              <Text style={styles.actionBtnText}>Запросить разрешение</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Уведомления в приложении</Text>
              <Text style={styles.settingSub}>
                Включить напоминания о приёме
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor={
                Platform.OS === "android"
                  ? notificationsEnabled
                    ? COLORS.blue
                    : "#334155"
                  : undefined
              }
              trackColor={{
                false: "rgba(148,163,184,0.25)",
                true: "rgba(56,189,248,0.35)",
              }}
            />
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, !canUseNotifications && styles.disabled]}
            activeOpacity={0.85}
            onPress={sendTestNotification}
            disabled={!canUseNotifications}
          >
            <Ionicons
              name="paper-plane-outline"
              size={18}
              color={COLORS.blue}
            />
            <Text style={styles.actionBtnText}>
              Тест: NOW + TRIGGER (Notifee)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, (!nf || diagLoading) && styles.disabled]}
            activeOpacity={0.85}
            onPress={showScheduledDiagnostics}
            disabled={!nf || diagLoading}
          >
            <Ionicons name="bug-outline" size={18} color={COLORS.blue} />
            <Text style={styles.actionBtnText}>
              {diagLoading
                ? "Собираем список…"
                : "Диагностика: запланированные (Notifee)"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={clearLegacyExpoScheduled}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.orange} />
            <Text style={styles.actionBtnText}>
              Очистить старые Expo scheduled
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={openAppNotifSettings}
          >
            <Ionicons name="settings-outline" size={18} color={COLORS.blue} />
            <Text style={styles.actionBtnText}>
              Открыть настройки уведомлений приложения
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={openDefaultChannelSettings}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={COLORS.blue}
            />
            <Text style={styles.actionBtnText}>
              Открыть настройки канала med_default
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={openAlarmSettings}
          >
            <Ionicons name="alarm-outline" size={18} color={COLORS.orange} />
            <Text style={styles.actionBtnText}>
              Открыть “Alarms & reminders”
            </Text>
          </TouchableOpacity>

          {!!lastInfo ? <Text style={styles.noteText}>{lastInfo}</Text> : null}

          <View style={styles.divider} />

          {/* Quiet hours */}
          <View
            style={[
              styles.settingRow,
              !notificationsEnabled && styles.disabled,
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Тихие часы</Text>
              <Text style={styles.settingSub}>
                В это время уведомления приходят без звука
              </Text>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              disabled={!notificationsEnabled}
              thumbColor={
                Platform.OS === "android"
                  ? quietHoursEnabled
                    ? COLORS.blue
                    : "#334155"
                  : undefined
              }
              trackColor={{
                false: "rgba(148,163,184,0.25)",
                true: "rgba(56,189,248,0.35)",
              }}
            />
          </View>

          {quietHoursEnabled && notificationsEnabled ? (
            <View style={styles.inlineRow}>
              <TouchableOpacity
                style={styles.inlineChip}
                onPress={() => setPickQuietFromOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="time-outline" size={16} color={COLORS.muted2} />
                <Text style={styles.inlineChipText}>С: {quietFrom}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inlineChip}
                onPress={() => setPickQuietToOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="time-outline" size={16} color={COLORS.muted2} />
                <Text style={styles.inlineChipText}>По: {quietTo}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Repeat */}
          <View
            style={[
              styles.settingRow,
              !notificationsEnabled && styles.disabled,
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Повтор напоминания</Text>
              <Text style={styles.settingSub}>
                Если не отмечено — повторять до следующего приёма
              </Text>
            </View>
            <Switch
              value={repeatEnabled}
              onValueChange={setRepeatEnabled}
              disabled={!notificationsEnabled}
              thumbColor={
                Platform.OS === "android"
                  ? repeatEnabled
                    ? COLORS.blue
                    : "#334155"
                  : undefined
              }
              trackColor={{
                false: "rgba(148,163,184,0.25)",
                true: "rgba(56,189,248,0.35)",
              }}
            />
          </View>

          {repeatEnabled && notificationsEnabled ? (
            <>
              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setPickRepeatOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.selectRowText}>
                  Через {repeatMinutes} минут
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.muted2}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setPickRepeatCountOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.selectRowText}>
                  Повторов: {repeatCount}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.muted2}
                />
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* EAS Update */}
        <View style={styles.sectionHeader}>
          <Ionicons
            name="cloud-download-outline"
            size={18}
            color={COLORS.blue}
          />
          <Text style={styles.sectionTitle}>EAS Update</Text>
        </View>

        <View style={styles.card}>
          {!updatesInfo.ok ? (
            <Text style={styles.noteText}>
              {updatesInfo.error === "loading"
                ? "Проверяем expo-updates…"
                : updatesInfo.error}
            </Text>
          ) : (
            <>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>runtimeVersion</Text>
                <Text style={styles.aboutValue}>
                  {updatesInfo.runtimeVersion ?? "—"}
                </Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>channel</Text>
                <Text style={styles.aboutValue}>
                  {updatesInfo.channel ?? "—"}
                </Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>branch</Text>
                <Text style={styles.aboutValue}>
                  {updatesInfo.branch ?? "—"}
                </Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>updateId</Text>
                <Text style={styles.aboutValue}>
                  {updatesInfo.updateId ?? "—"}
                </Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>embedded</Text>
                <Text style={styles.aboutValue}>
                  {updatesInfo.isEmbeddedLaunch === null
                    ? "—"
                    : updatesInfo.isEmbeddedLaunch
                      ? "да"
                      : "нет"}
                </Text>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  (!Updates || updatesBusy) && styles.disabled,
                ]}
                activeOpacity={0.85}
                onPress={checkForUpdates}
                disabled={!Updates || updatesBusy}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={COLORS.blue}
                />
                <Text style={styles.actionBtnText}>Проверить обновление</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  (!Updates || updatesBusy) && styles.disabled,
                ]}
                activeOpacity={0.85}
                onPress={fetchAndReload}
                disabled={!Updates || updatesBusy}
              >
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={COLORS.blue}
                />
                <Text style={styles.actionBtnText}>
                  Скачать и перезапустить
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* pickers */}
      <SelectSheet
        visible={pickQuietFromOpen}
        title="Тихие часы — начало"
        subtitle="Выбери время, с которого уведомления будут приходить без звука"
        selectedKey={quietFrom}
        items={times.map((t) => ({ key: t, label: t }))}
        onSelect={(k) => {
          setQuietFrom(k);
          setPickQuietFromOpen(false);
        }}
        onClose={() => setPickQuietFromOpen(false)}
      />
      <SelectSheet
        visible={pickQuietToOpen}
        title="Тихие часы — окончание"
        subtitle="Выбери время, до которого уведомления будут приходить без звука"
        selectedKey={quietTo}
        items={times.map((t) => ({ key: t, label: t }))}
        onSelect={(k) => {
          setQuietTo(k);
          setPickQuietToOpen(false);
        }}
        onClose={() => setPickQuietToOpen(false)}
      />
      <SelectSheet
        visible={pickRepeatOpen}
        title="Повтор напоминания"
        subtitle="Через сколько минут повторять, если не отмечено"
        selectedKey={String(repeatMinutes)}
        items={repeatOptions}
        onSelect={(k) => {
          setRepeatMinutes(Number(k));
          setPickRepeatOpen(false);
        }}
        onClose={() => setPickRepeatOpen(false)}
      />
      <SelectSheet
        visible={pickRepeatCountOpen}
        title="Количество повторов"
        subtitle="Сколько раз повторить (до следующего приёма)"
        selectedKey={String(repeatCount)}
        items={repeatCountOptions}
        onSelect={(k) => {
          setRepeatCount(Number(k));
          setPickRepeatCountOpen(false);
        }}
        onClose={() => setPickRepeatCountOpen(false)}
      />

      {/* diagnostics modal */}
      <Modal
        visible={diagOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDiagOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setDiagOpen(false)}
        />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet} pointerEvents="auto">
            <Text style={styles.sheetTitle}>Диагностика уведомлений</Text>
            <Text style={styles.sheetSubtitle}>
              Notifee trigger + displayed + channel + alarm + scheduler debug.
            </Text>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator>
              <Text
                style={{
                  color: COLORS.title,
                  fontWeight: "800",
                  fontSize: 12,
                  lineHeight: 18,
                }}
                selectable
              >
                {diagText}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setDiagOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetCancelText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
    ...Platform.select({
      web: { boxShadow: "0px 6px 18px rgba(0,0,0,0.35)" } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
    zIndex: 10,
  },

  headerFade: { height: 14, backgroundColor: COLORS.bg },
  fadeRow: { flex: 1, backgroundColor: "#000" },

  title: { color: COLORS.title, fontSize: 20, fontWeight: "900" },
  content: { padding: 16 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: { color: COLORS.title, fontSize: 16, fontWeight: "900" },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },

  cardTitle: {
    color: COLORS.muted,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.4,
  },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { color: COLORS.title, fontWeight: "900", fontSize: 16 },
  statLabel: {
    marginTop: 6,
    color: COLORS.muted2,
    fontWeight: "800",
    fontSize: 11,
    lineHeight: 14,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.10)",
    marginVertical: 12,
  },

  settingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingTitle: { color: COLORS.title, fontWeight: "900", fontSize: 14 },
  settingSub: {
    marginTop: 4,
    color: COLORS.muted2,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
  },

  disabled: { opacity: 0.55 },

  inlineRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  inlineChip: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineChipText: { color: COLORS.title, fontWeight: "900", fontSize: 12 },

  selectRow: {
    marginTop: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectRowText: { color: COLORS.title, fontWeight: "900" },

  actionBtn: {
    marginTop: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtnText: { color: COLORS.title, fontWeight: "900" },

  noteText: {
    marginTop: 10,
    color: COLORS.muted2,
    fontWeight: "700",
    lineHeight: 18,
  },

  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    gap: 12,
  },
  aboutLabel: { color: COLORS.muted, fontWeight: "900" },
  aboutValue: { color: COLORS.title, fontWeight: "900", flexShrink: 1 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRowText: { flex: 1, color: COLORS.title, fontWeight: "800" },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(56,189,248,0.10)",
  },
  smallBtnText: { color: COLORS.title, fontWeight: "900", fontSize: 12 },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetWrap: { flex: 1, justifyContent: "flex-end", padding: 16 },
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetTitle: { color: COLORS.title, fontSize: 16, fontWeight: "900" },
  sheetSubtitle: {
    color: COLORS.muted2,
    fontWeight: "700",
    marginTop: 6,
    lineHeight: 18,
  },

  sheetItem: {
    marginTop: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sheetItemActive: {
    borderColor: "rgba(56,189,248,0.35)",
    backgroundColor: "rgba(56,189,248,0.10)",
  },
  sheetItemText: { color: COLORS.title, fontWeight: "900" },
  sheetItemRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetItemRightText: { color: COLORS.muted2, fontWeight: "800" },

  sheetCancel: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  sheetCancelText: { color: COLORS.title, fontWeight: "900" },
});
