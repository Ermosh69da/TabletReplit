import { useMemo, useState, type ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import TodayStatusSheet from "../../components/TodayStatusSheet";
import {
  type Period,
  useMedications,
  type Medication,
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

type Dose = {
  key: string; // medId@time
  med: Medication;
  time: string;
  period: Period;
};

function periodFromTime(time: string, fallback: Period): Period {
  const h = Number(time.split(":")[0] ?? 0);
  if (Number.isNaN(h)) return fallback;
  if (h >= 5 && h <= 11) return "morning";
  if (h >= 12 && h <= 17) return "day";
  return "evening";
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

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();

  const {
    medications,
    todayProgress,
    getTodayStatus,
    setTodayStatus,
    isDueToday,
  } = useMedications();
  const [period, setPeriod] = useState<Period>("evening");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<{
    medId: string;
    time: string;
  } | null>(null);

  const selectedMed = useMemo(() => {
    if (!selected) return null;
    return medications.find((m) => m.id === selected.medId) ?? null;
  }, [medications, selected]);

  const allDoses = useMemo((): Dose[] => {
    const dueMeds = medications.filter((m) => isDueToday(m));
    const doses: Dose[] = [];

    for (const med of dueMeds) {
      const times = getTimes(med);
      for (const t of times) {
        doses.push({
          key: `${med.id}@${t}`,
          med,
          time: t,
          period: periodFromTime(t, med.period),
        });
      }
    }

    return doses.sort((a, b) => a.time.localeCompare(b.time));
  }, [medications, isDueToday]);

  const periodStats = useMemo(() => {
    const res: Record<Period, { due: number; taken: number; skipped: number }> =
      {
        morning: { due: 0, taken: 0, skipped: 0 },
        day: { due: 0, taken: 0, skipped: 0 },
        evening: { due: 0, taken: 0, skipped: 0 },
      };

    for (const d of allDoses) {
      res[d.period].due += 1;
      const st = getTodayStatus(d.med.id, d.time);
      if (st === "taken") res[d.period].taken += 1;
      if (st === "skipped") res[d.period].skipped += 1;
    }

    return res;
  }, [allDoses, getTodayStatus, todayProgress]);

  const todayList = useMemo(
    () => allDoses.filter((d) => d.period === period),
    [allDoses, period],
  );

  const openSheet = (medId: string, time: string) => {
    setSelected({ medId, time });
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSelected(null);
  };

  const onShortPress = (medId: string, time: string) => {
    const cur = getTodayStatus(medId, time);
    setTodayStatus(medId, cur === "taken" ? "pending" : "taken", time);
  };

  return (
    <View style={styles.container}>
      {/* ✅ ФИКСИРОВАННЫЙ TOP HEADER */}
      <View style={styles.topHeader}>
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

      <HeaderFade />

      {/* ✅ Скроллится всё ниже */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 },
        ]}
      >
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
          todayList.map((d) => {
            const status = getTodayStatus(d.med.id, d.time);
            const isTaken = status === "taken";
            const isSkipped = status === "skipped";

            return (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.planItem,
                  isTaken && styles.planItemTaken,
                  isSkipped && styles.planItemSkipped,
                ]}
                onPress={() => onShortPress(d.med.id, d.time)}
                onLongPress={() => openSheet(d.med.id, d.time)}
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
                    {d.med.name}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={COLORS.muted2}
                    />
                    <Text style={styles.metaText}>{d.time}</Text>
                    <Text style={styles.metaSep}>•</Text>
                    <Text style={styles.metaText}>{d.med.dosage}</Text>
                  </View>
                </View>

                <View style={styles.rightCol}>
                  <View
                    style={[
                      styles.badge,
                      isTaken
                        ? styles.badgeTaken
                        : isSkipped
                          ? styles.badgeSkipped
                          : styles.badgePending,
                    ]}
                  >
                    <Text
                      style={
                        isTaken
                          ? styles.badgeTextTaken
                          : isSkipped
                            ? styles.badgeTextSkipped
                            : styles.badgeTextPending
                      }
                    >
                      {isTaken
                        ? "принято"
                        : isSkipped
                          ? "пропущено"
                          : "ожидает"}
                    </Text>
                  </View>

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
          selectedMed && selected
            ? `${selected.time} • ${selectedMed.dosage}`
            : undefined
        }
        currentStatus={
          selected ? getTodayStatus(selected.medId, selected.time) : "pending"
        }
        onClose={closeSheet}
        onSelect={(nextStatus) => {
          if (selected)
            setTodayStatus(selected.medId, nextStatus, selected.time);
          closeSheet();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  topHeader: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

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

  h1: { color: COLORS.title, fontSize: 20, fontWeight: "800" },
  date: { color: COLORS.muted, marginTop: 4 },
  plus: { backgroundColor: COLORS.blue, borderRadius: 12, padding: 10 },

  content: { padding: 16 },

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
  },
  checkOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  checkSkipped: { backgroundColor: "#A3A3A3", borderColor: "#A3A3A3" },
});
