import { useMemo, useState, type ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

import TodayStatusSheet from "../../components/TodayStatusSheet";
import {
  type Period,
  useMedications,
} from "../../components/MedicationsContext";

function formatDateRu(d = new Date()) {
  const weekday = d.toLocaleDateString("ru-RU", { weekday: "long" });
  const dayMonth = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
  return `${weekday}, ${dayMonth}`;
}

const COLORS = {
  bg: "#050B18",
  surface: "#0E1629",
  surface2: "#0B1220",
  border: "rgba(148,163,184,0.14)",

  title: "#F8FAFC",
  muted: "#94A3B8",
  muted2: "#64748B",

  blue: "#38BDF8",
  blueDeep: "#2563EB",

  amber: "#FBBF24",
  amberSoft: "#FDE68A",
  orange: "#F59E0B",

  grayChip: "#111827",
};

const periodConfig: Record<
  Period,
  { icon: ComponentProps<typeof Ionicons>["name"]; label: string }
> = {
  morning: { icon: "sunny-outline", label: "утро" },
  day: { icon: "partly-sunny-outline", label: "день" },
  evening: { icon: "moon-outline", label: "вечер" },
};

export default function HomeScreen() {
  const { medications, todayProgress, getTodayStatus, setTodayStatus } =
    useMedications();

  const [period, setPeriod] = useState<Period>("evening");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedMed = useMemo(
    () => medications.find((m) => m.id === selectedId) ?? null,
    [medications, selectedId],
  );

  const periodStats = useMemo(() => {
    const res: Record<Period, { due: number; taken: number; skipped: number }> =
      {
        morning: { due: 0, taken: 0, skipped: 0 },
        day: { due: 0, taken: 0, skipped: 0 },
        evening: { due: 0, taken: 0, skipped: 0 },
      };

    const list = medications.filter((m) => m.repeat === "daily");
    for (const m of list) {
      res[m.period].due += 1;
      const st = getTodayStatus(m.id);
      if (st === "taken") res[m.period].taken += 1;
      if (st === "skipped") res[m.period].skipped += 1;
    }

    return res;
  }, [medications, todayProgress, getTodayStatus]);

  const todayList = useMemo(() => {
    return medications
      .filter((m) => m.repeat === "daily" && m.period === period)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [medications, period]);

  const openSheet = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSelectedId(null);
  };

  const onShortPress = (id: string) => {
    const cur = getTodayStatus(id);
    // tap: pending <-> taken (если было skipped, станет taken)
    setTodayStatus(id, cur === "taken" ? "pending" : "taken");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Top bar */}
        <View style={styles.top}>
          <View>
            <Text style={styles.h1}>Прими пилюльку !!!</Text>
            <Text style={styles.date}>{formatDateRu()}</Text>
          </View>

          <Link href="/medications/new" asChild>
            <TouchableOpacity style={styles.plus}>
              <Ionicons name="add" size={24} color="#0B1220" />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressTitle}>ПРОГРЕСС СЕГОДНЯ</Text>
            <Text style={styles.progressMeta}>
              {todayProgress.taken} / {todayProgress.totalForProgress}
              {todayProgress.skipped > 0
                ? ` • пропущено ${todayProgress.skipped}`
                : ""}
            </Text>
          </View>

          <View style={styles.progressMainRow}>
            <Text style={styles.progressPercent}>{todayProgress.percent}%</Text>

            <View style={styles.progressPill}>
              <Ionicons name="pulse-outline" size={14} color={COLORS.blue} />
              <Text style={styles.progressPillText}>сегодня</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${todayProgress.percent}%` },
              ]}
            />
          </View>
        </View>

        {/* Period tiles */}
        <View style={styles.periodRow}>
          {(["morning", "day", "evening"] as Period[]).map((p) => {
            const active = p === period;
            const cfg = periodConfig[p];
            const st = periodStats[p];

            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.periodCard, active && styles.periodCardActive]}
                activeOpacity={0.88}
              >
                <View
                  style={[
                    styles.periodIconWrap,
                    active && styles.periodIconWrapActive,
                  ]}
                >
                  <Ionicons
                    name={cfg.icon}
                    size={18}
                    color={active ? COLORS.amberSoft : COLORS.amber}
                  />
                </View>

                <Text
                  style={[
                    styles.periodCardText,
                    active && styles.periodCardTextActive,
                  ]}
                >
                  {cfg.label.toUpperCase()}
                </Text>

                <Text
                  style={[
                    styles.periodCardSub,
                    active && styles.periodCardSubActive,
                  ]}
                >
                  {st.taken}/{st.due}
                  {st.skipped > 0 ? ` (−${st.skipped})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Plan header */}
        <View style={styles.sectionHeader}>
          <Ionicons name="list-outline" size={18} color={COLORS.blue} />
          <Text style={styles.sectionTitle}>План приёма</Text>
        </View>
        <Text style={styles.sectionSub}>
          Тап — “принято”, долгий тап — меню
        </Text>

        {todayList.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.muted}
            />
            <Text style={styles.emptyText}>
              На выбранный период приёмов нет
            </Text>
          </View>
        ) : (
          todayList.map((m) => {
            const status = getTodayStatus(m.id);
            const isTaken = status === "taken";
            const isSkipped = status === "skipped";

            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.planItem,
                  isTaken && styles.planItemTaken,
                  isSkipped && styles.planItemSkipped,
                ]}
                onPress={() => onShortPress(m.id)}
                onLongPress={() => openSheet(m.id)}
                delayLongPress={350}
                activeOpacity={0.88}
              >
                <View
                  style={[
                    styles.statusBar,
                    isTaken && styles.statusBarTaken,
                    isSkipped && styles.statusBarSkipped,
                  ]}
                />

                <View style={styles.planContent}>
                  <Text
                    style={[styles.planName, isTaken && styles.planNameDone]}
                  >
                    {m.name}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={COLORS.muted2}
                    />
                    <Text style={styles.metaText}>{m.time}</Text>
                    <Text style={styles.metaSep}>•</Text>
                    <Text style={styles.metaText}>{m.dosage}</Text>
                  </View>
                </View>

                <View style={styles.rightCol}>
                  {isTaken ? (
                    <View style={[styles.badge, styles.badgeTaken]}>
                      <Text style={styles.badgeTextTaken}>принято</Text>
                    </View>
                  ) : isSkipped ? (
                    <View style={[styles.badge, styles.badgeSkipped]}>
                      <Text style={styles.badgeTextSkipped}>пропущено</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, styles.badgePending]}>
                      <Text style={styles.badgeTextPending}>ожидает</Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.check,
                      isTaken && styles.checkOn,
                      isSkipped && styles.checkSkipped,
                    ]}
                  >
                    {isTaken ? (
                      <Ionicons name="checkmark" size={16} color="#0B1220" />
                    ) : isSkipped ? (
                      <Ionicons name="close" size={16} color="#0B1220" />
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TodayStatusSheet
        visible={sheetOpen}
        title={selectedMed ? selectedMed.name : "Приём"}
        subtitle={
          selectedMed
            ? `${selectedMed.time} • ${selectedMed.dosage}`
            : undefined
        }
        currentStatus={selectedId ? getTodayStatus(selectedId) : "pending"}
        onClose={closeSheet}
        onSelect={(nextStatus) => {
          if (selectedId) setTodayStatus(selectedId, nextStatus);
          closeSheet();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },

  top: {
    marginTop: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  h1: { color: COLORS.title, fontSize: 20, fontWeight: "800" },
  date: { color: COLORS.muted, marginTop: 4 },
  plus: { backgroundColor: COLORS.blue, borderRadius: 12, padding: 10 },

  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  progressMeta: { color: COLORS.blue, fontSize: 12, fontWeight: "800" },

  progressMainRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressPercent: { color: COLORS.title, fontSize: 30, fontWeight: "900" },
  progressPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressPillText: { color: COLORS.muted, fontWeight: "800", fontSize: 12 },

  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.surface2,
    borderRadius: 999,
    marginTop: 10,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: COLORS.blueDeep,
    borderRadius: 999,
  },

  periodRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  periodCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodCardActive: {
    backgroundColor: "rgba(37,99,235,0.26)",
    borderColor: "rgba(56,189,248,0.55)",
  },
  periodIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  periodIconWrapActive: {
    backgroundColor: "rgba(251,191,36,0.10)",
    borderColor: "rgba(251,191,36,0.35)",
  },
  periodCardText: {
    color: COLORS.muted,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.7,
  },
  periodCardTextActive: { color: COLORS.title },
  periodCardSub: {
    color: COLORS.muted2,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  periodCardSubActive: { color: COLORS.muted },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: { color: COLORS.title, fontSize: 16, fontWeight: "900" },
  sectionSub: { color: COLORS.muted2, marginTop: 6, marginBottom: 10 },

  empty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.muted, fontWeight: "700" },

  planItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planItemTaken: { borderColor: "rgba(56,189,248,0.55)" },
  planItemSkipped: { borderColor: "rgba(245,158,11,0.55)" },

  statusBar: {
    width: 4,
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.25)",
    marginRight: 12,
  },
  statusBarTaken: { backgroundColor: COLORS.blue },
  statusBarSkipped: { backgroundColor: COLORS.orange },

  planContent: { flex: 1, paddingRight: 12 },
  planName: { color: COLORS.title, fontSize: 15, fontWeight: "900" },
  planNameDone: { textDecorationLine: "line-through", color: COLORS.muted },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  metaText: { color: COLORS.muted2, fontSize: 12, fontWeight: "800" },
  metaSep: { color: COLORS.muted2, fontSize: 12, fontWeight: "800" },

  rightCol: { alignItems: "flex-end", gap: 10 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgePending: {
    backgroundColor: COLORS.grayChip,
    borderColor: COLORS.border,
  },
  badgeTaken: {
    backgroundColor: "rgba(56,189,248,0.12)",
    borderColor: "rgba(56,189,248,0.45)",
  },
  badgeSkipped: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.45)",
  },

  badgeTextPending: { color: COLORS.muted, fontSize: 11, fontWeight: "900" },
  badgeTextTaken: { color: COLORS.blue, fontSize: 11, fontWeight: "900" },
  badgeTextSkipped: { color: COLORS.orange, fontSize: 11, fontWeight: "900" },

  check: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  checkSkipped: { backgroundColor: "#A3A3A3", borderColor: "#A3A3A3" },
});
