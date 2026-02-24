import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import notifee, {
  EventType,
  TriggerType,
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
} from "@notifee/react-native";
import { BlurView } from "expo-blur"; // <-- Используем для красивого размытия фона

import { useMedications } from "./MedicationsContext";

type DoseItem = {
  medId: string;
  name: string;
  dosage?: string;
  time: string;
};

const UI_KIND = "MED_REMINDER";

const UI = {
  card: "#0F172A",
  card2: "#111C33",
  border: "#22304A",
  text: "#F8FAFC",
  muted: "#94A3B8",
  confirm: "#22C55E",
  skip: "#EF4444",
  snoozeBg: "rgba(147,197,253,0.15)", // полупрозрачный синий
};

function normalizeTime(t: string) {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
}

function keyFromPayload(p: any) {
  const g = String(p?.groupKey ?? "");
  const dk = String(p?.dateKey ?? "");
  const t = String(p?.time ?? "");
  const dt = String(p?.displayTime ?? "");
  return `${g}|${dk}|${t}|${dt}`;
}

function safeJsonParse<T>(s: any, fallback: T): T {
  try {
    if (typeof s !== "string") return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

async function cancelGroupByGroupKey(groupKey: string) {
  if (!groupKey) return;

  const triggers = await notifee.getTriggerNotifications();
  const ids = triggers
    .filter(
      (x) => String((x.notification?.data as any)?.groupKey ?? "") === groupKey,
    )
    .map((x) => x.notification.id)
    .filter(Boolean);

  await Promise.all(ids.map((id) => notifee.cancelTriggerNotification(id)));

  const shown = await notifee.getDisplayedNotifications();
  const shownIds = shown
    .filter(
      (x) => String((x.notification?.data as any)?.groupKey ?? "") === groupKey,
    )
    .map((x) => x.notification.id)
    .filter(Boolean);

  await Promise.all(shownIds.map((id) => notifee.cancelNotification(id)));
}

function ReminderCard({
  visible,
  displayTime,
  doses,
  onClose,
  onSkipAll,
  onConfirmAll,
  onSnoozeConfirmed,
}: {
  visible: boolean;
  displayTime: string;
  doses: DoseItem[];
  onClose: () => void;
  onSkipAll: () => void;
  onConfirmAll: () => void;
  onSnoozeConfirmed: (minutes: number) => void;
}) {
  const title = `${doses.length} новых задания для ${displayTime}`;
  const [snoozeMin, setSnoozeMin] = useState(15);

  const handleMinus = () => setSnoozeMin((prev) => Math.max(5, prev - 5));
  const handlePlus = () => setSnoozeMin((prev) => Math.min(60, prev + 5));

  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Красивое размытие заднего фона (BlurView) */}
      <BlurView intensity={60} tint="dark" style={styles.overlay}>
        {/* Клик по пустому месту закроет карточку без действий */}
        <TouchableOpacity
          style={styles.overlayClickable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.card} pointerEvents="auto">
          <Text style={styles.headerTitle}>{title}</Text>

          <View style={styles.list}>
            {doses.map((d, idx) => (
              <View key={`${d.medId}@${d.time}@${idx}`} style={styles.item}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemIcon}>
                    <Ionicons
                      name="medical-outline"
                      size={16}
                      color="#93C5FD"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {d.dosage ? d.dosage : "—"}
                    </Text>
                  </View>
                </View>

                {idx !== doses.length - 1 ? (
                  <View style={styles.itemDivider} />
                ) : null}
              </View>
            ))}
          </View>

          {/* Кнопки Пропустить / Принять */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionBtn, styles.skipBtn]}
              onPress={onSkipAll}
            >
              <Text style={styles.actionBtnText}>Пропустить{"\n"}все</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={onConfirmAll}
            >
              <Text style={[styles.actionBtnText, { color: "#052012" }]}>
                Подтвердить{"\n"}все
              </Text>
            </TouchableOpacity>
          </View>

          {/* Панель Отложить (Snooze) */}
          <View style={styles.snoozeContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.snoozeRoundBtn}
              onPress={handleMinus}
            >
              <Ionicons name="remove" size={24} color="#93C5FD" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.snoozeMainBtn}
              onPress={() => onSnoozeConfirmed(snoozeMin)}
            >
              <Text style={styles.snoozeMainText}>
                отложить на {snoozeMin} минут
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.snoozeRoundBtn}
              onPress={handlePlus}
            >
              <Ionicons name="add" size={24} color="#93C5FD" />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

export default function MedicationReminderOverlay() {
  const { setStatusForDate }: any = useMedications();

  const [visible, setVisible] = useState(false);
  const [displayTime, setDisplayTime] = useState("00:00");
  const [dateKey, setDateKey] = useState("");
  const [groupKey, setGroupKey] = useState("");
  const [doses, setDoses] = useState<DoseItem[]>([]);
  const [rawPayload, setRawPayload] = useState<any>(null); // Сохраняем payload для Snooze

  const lastShownKeyRef = useRef<string | null>(null);

  const close = () => setVisible(false);

  const present = (payload: any) => {
    const k = keyFromPayload(payload);
    if (k && lastShownKeyRef.current === k) return;
    lastShownKeyRef.current = k;

    const logicalTime = normalizeTime(String(payload?.time ?? "00:00"));
    const uiTime = normalizeTime(String(payload?.displayTime ?? logicalTime));

    const rawDoses = safeJsonParse<any[]>(payload?.dosesJson, []);
    const list: DoseItem[] = rawDoses
      .map((d: any) => ({
        medId: String(d.medId),
        name: String(d.name),
        dosage: d.dosage ? String(d.dosage) : undefined,
        time: normalizeTime(String(d.time ?? logicalTime)),
      }))
      .filter((d) => d.medId && d.name);

    setDisplayTime(uiTime);
    setDateKey(String(payload?.dateKey ?? ""));
    setGroupKey(String(payload?.groupKey ?? ""));
    setDoses(list);
    setRawPayload(payload);
    setVisible(true);
  };

  const tryPresentFromDisplayed = async () => {
    const shown = await notifee.getDisplayedNotifications();
    const candidates = shown
      .map((x) => ({ data: x.notification.data as any }))
      .filter(({ data }) => data?.kind === UI_KIND);

    if (candidates.length === 0) return;
    present(candidates[candidates.length - 1]!.data);
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let unsub: any;

    (async () => {
      const init = await notifee.getInitialNotification();
      const data: any = init?.notification?.data ?? null;
      if (data?.kind === UI_KIND) present(data);
    })();

    unsub = notifee.onForegroundEvent(({ type, detail }) => {
      const data: any = detail.notification?.data ?? null;
      if (!data || data.kind !== UI_KIND) return;

      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        present(data);
      }
    });

    const subApp = AppState.addEventListener("change", (st) => {
      if (st === "active") tryPresentFromDisplayed().catch(() => {});
    });

    tryPresentFromDisplayed().catch(() => {});

    return () => {
      try {
        unsub?.();
      } catch {}
      subApp.remove();
    };
  }, []);

  const onSkipAll = async () => {
    for (const d of doses)
      setStatusForDate(dateKey, d.medId, "skipped", d.time);
    await cancelGroupByGroupKey(groupKey);
    close();
  };

  const onConfirmAll = async () => {
    for (const d of doses) setStatusForDate(dateKey, d.medId, "taken", d.time);
    await cancelGroupByGroupKey(groupKey);
    close();
  };

  // ЛОГИКА ОТКЛАДЫВАНИЯ (SNOOZE) ИЗ ФОРГРАУНД КАРТОЧКИ
  const onSnoozeConfirmed = async (minutes: number) => {
    if (!rawPayload) return;

    const now = Date.now();
    const snoozeAt = new Date(now + minutes * 60 * 1000); // Прибавляем минуты
    const hh = String(snoozeAt.getHours()).padStart(2, "0");
    const mm = String(snoozeAt.getMinutes()).padStart(2, "0");
    const snoozeDisplayTime = `${hh}:${mm}`;

    const id = `snooze:${String(rawPayload.groupKey ?? "unknown")}:${now}`;

    const lines = doses.slice(0, 6).map((d: any) => {
      const dosage = d.dosage ? ` (${d.dosage})` : "";
      return `${d.name}${dosage}`;
    });

    const nextData: Record<string, string> = {
      ...rawPayload,
      auto: "0",
      displayTime: snoozeDisplayTime,
      snooze: "1",
    };

    // Создаем новое уведомление на будущее
    await notifee.createTriggerNotification(
      {
        id,
        title: "Приём таблеток (отложено)",
        body: `${snoozeDisplayTime} • напоминание`,
        data: nextData,
        android: {
          channelId: "med_default_v3", // ИСПОЛЬЗУЕМ КАНАЛ V3!
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

    // Удаляем текущее уведомление и закрываем карточку
    await cancelGroupByGroupKey(groupKey);
    close();
  };

  return (
    <ReminderCard
      visible={visible}
      displayTime={displayTime}
      doses={doses}
      onClose={close}
      onSkipAll={onSkipAll}
      onConfirmAll={onConfirmAll}
      onSnoozeConfirmed={onSnoozeConfirmed}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
  },
  overlayClickable: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 2,
    borderColor: "#38BDF8", // Светло-синяя рамка для выделения
    ...Platform.select({
      android: { elevation: 15 },
      ios: {
        shadowColor: "#93C5FD",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
    }),
  },
  headerTitle: {
    color: UI.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },
  list: {
    backgroundColor: UI.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: "hidden",
  },
  item: { paddingHorizontal: 14, paddingVertical: 12 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(147,197,253,0.12)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { color: UI.text, fontSize: 15, fontWeight: "900" },
  itemSub: { color: UI.muted, marginTop: 4, fontSize: 13, fontWeight: "800" },
  itemDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 12,
  },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  actionBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: { backgroundColor: UI.skip },
  confirmBtn: { backgroundColor: UI.confirm },
  actionBtnText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  // Стили для новой панели Отложить (Snooze)
  snoozeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  snoozeRoundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: UI.snoozeBg,
    alignItems: "center",
    justifyContent: "center",
  },
  snoozeMainBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: UI.snoozeBg,
    alignItems: "center",
    justifyContent: "center",
  },
  snoozeMainText: {
    color: "#93C5FD", // Светло-синий цвет текста
    fontWeight: "800",
    fontSize: 14,
  },
});
