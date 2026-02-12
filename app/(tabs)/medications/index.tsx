import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import MedicationActionsSheet from "../../../components/MedicationActionsSheet";
import {
  useMedications,
  type Medication,
  periodLabel,
  type Period,
} from "../../../components/MedicationsContext";

function ruDateFromKey(key: string) {
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}.${m}.${y}`;
}

const DOW_LABEL: Record<number, string> = {
  1: "ПН",
  2: "ВТ",
  3: "СР",
  4: "ЧТ",
  5: "ПТ",
  6: "СБ",
  0: "ВС",
};

function formatWeekdays(days?: number[]) {
  if (!days || days.length === 0) return "—";
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map((d) => DOW_LABEL[d] ?? String(d)).join(", ");
}

function formatDates(dates?: string[]) {
  if (!dates || dates.length === 0) return "—";
  return [...dates].sort().map(ruDateFromKey).join(", ");
}

function getStartDateLabel(m: Medication) {
  if (
    (m as any).repeat === "dates" &&
    (m as any).dates &&
    (m as any).dates.length > 0
  ) {
    const min = [...(m as any).dates].sort()[0];
    return ruDateFromKey(min);
  }
  if ((m as any).startDate) return ruDateFromKey((m as any).startDate);
  return "—";
}

function repeatLine(m: Medication) {
  const repeat = (m as any).repeat as
    | "daily"
    | "weekdays"
    | "dates"
    | undefined;

  if (repeat === "daily" || !repeat) return { label: "Ежедневно", value: "" };
  if (repeat === "weekdays")
    return { label: "По дням:", value: formatWeekdays((m as any).weekdays) };
  return { label: "Даты приёма:", value: formatDates((m as any).dates) };
}

function getTimes(m: Medication): string[] {
  const anyM = m as any;

  if (Array.isArray(anyM.times) && anyM.times.length > 0) {
    return [...anyM.times]
      .map((t: any) => String(t).trim())
      .filter(Boolean)
      .sort();
  }

  const raw = typeof anyM.time === "string" ? anyM.time : "";
  const matches = raw.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
  const normalized = matches
    .map((t) => {
      const [h, mm] = t.split(":");
      return `${String(Number(h)).padStart(2, "0")}:${mm}`;
    })
    .filter(Boolean);

  if (normalized.length === 0 && raw.trim()) return [raw.trim()];
  return Array.from(new Set(normalized)).sort();
}

function periodFromTime(time: string): Period {
  const h = Number(time.split(":")[0] ?? 0);
  if (h >= 5 && h <= 11) return "morning";
  if (h >= 12 && h <= 17) return "day";
  return "evening";
}

function periodChipFromTimes(times: string[], fallback: Period): string {
  if (!times || times.length === 0) return periodLabel(fallback).toUpperCase();
  const periods = Array.from(new Set(times.map(periodFromTime)));
  const order: Period[] = ["morning", "day", "evening"];
  periods.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return periods.map((p) => periodLabel(p).toUpperCase()).join(", ");
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

export default function MedicationsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  const { medications, togglePaused } = useMedications();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Medication | null>(null);

  // ✅ Сначала активные, потом paused; внутри групп — сортировка по имени
  const list = useMemo(() => {
    return [...medications].sort((a, b) => {
      const pa = a.paused ? 1 : 0;
      const pb = b.paused ? 1 : 0;
      if (pa !== pb) return pa - pb; // active(0) -> paused(1)
      return a.name.localeCompare(b.name, "ru");
    });
  }, [medications]);

  const openActions = (m: Medication) => {
    setSelected(m);
    setSheetOpen(true);
  };

  const closeActions = () => {
    setSheetOpen(false);
    setSelected(null);
  };

  const goEdit = (id: string) => {
    router.push(`/medications/edit/${id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои лекарства</Text>

        <Link href="/medications/new" asChild>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.85}>
            <Ionicons name="add" size={24} color="#0B1220" />
          </TouchableOpacity>
        </Link>
      </View>

      <HeaderFade />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 },
        ]}
      >
        {list.map((m) => {
          const rep = repeatLine(m);
          const times = getTimes(m);
          const timesText = times.length ? times.join(" • ") : "—";
          const chipText = periodChipFromTimes(times, m.period);

          const paused = !!m.paused;

          const dosageRaw = String(m.dosage ?? "").trim();
          const hasDosage = dosageRaw.length > 0 && dosageRaw !== "—";

          return (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.9}
              onPress={() => openActions(m)}
              style={[styles.card, paused && styles.cardPaused]}
            >
              <View style={styles.topRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="medical-outline" size={18} color="#38BDF8" />
                </View>

                <View style={{ flex: 1 }}>
                  {/* 1-я строка: название; если paused — приглушаем и делаем толстое зачёркивание */}
                  {paused ? (
                    <View style={styles.medNameWrap}>
                      <Text
                        style={[styles.medName, styles.medNamePausedText]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {m.name}
                      </Text>
                      <View pointerEvents="none" style={styles.medNameStrike} />
                    </View>
                  ) : (
                    <Text
                      style={styles.medName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {m.name}
                    </Text>
                  )}

                  {/* 2-я строка: дозировка (если активное — показываем “—”, если paused — скрываем при отсутствии) */}
                  {paused ? (
                    hasDosage ? (
                      <Text style={styles.dosage}>{dosageRaw}</Text>
                    ) : null
                  ) : (
                    <Text style={styles.dosage}>{dosageRaw || "—"}</Text>
                  )}

                  {/* Чип: всегда отдельной строкой:
                      - если нет дозировки => после названия (2-я строка)
                      - если дозировка есть => после дозировки (3-я строка) */}
                  {paused ? (
                    <View
                      style={[
                        styles.pauseChipRow,
                        { marginTop: hasDosage ? 8 : 6 },
                      ]}
                    >
                      <View style={styles.pauseChip}>
                        <Text style={styles.pauseChipText}>ПРИОСТАНОВЛЕНО</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={styles.periodChip}>
                  <Text style={styles.periodChipText}>{chipText}</Text>
                </View>
              </View>

              {/* paused — короткая карточка */}
              {paused ? (
                <View style={styles.pausedDivider} />
              ) : (
                <>
                  <View style={styles.line}>
                    <Text style={styles.lineLabel}>Время приёма:</Text>
                    <Text style={styles.lineValue}>{timesText}</Text>
                  </View>

                  <View style={styles.line}>
                    <Text style={styles.lineLabel}>{rep.label}</Text>
                    {rep.value ? (
                      <Text style={styles.lineValue}>{rep.value}</Text>
                    ) : null}
                  </View>

                  <View style={styles.line}>
                    <Text style={styles.lineLabel}>Начало приёма:</Text>
                    <Text style={styles.lineValue}>{getStartDateLabel(m)}</Text>
                  </View>

                  {!!m.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Заметки</Text>
                      <Text style={styles.notesText}>{m.notes}</Text>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <MedicationActionsSheet
        visible={sheetOpen}
        title={selected?.name ?? "Лекарство"}
        paused={!!selected?.paused}
        onClose={closeActions}
        onEdit={() => {
          if (selected) goEdit(selected.id);
          closeActions();
        }}
        onTogglePause={() => {
          if (selected) togglePaused(selected.id);
          closeActions();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050B18" },

  header: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#050B18",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  headerFade: { height: 14, backgroundColor: "#050B18" },
  fadeRow: { flex: 1, backgroundColor: "#000" },

  title: { color: "#E5E7EB", fontSize: 20, fontWeight: "900" },
  addButton: { backgroundColor: "#38BDF8", borderRadius: 12, padding: 10 },

  scroll: { flex: 1 },
  content: { padding: 16 },

  card: {
    backgroundColor: "#0E1629",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },

  // paused заметно отличается по цвету
  cardPaused: {
    backgroundColor: "rgba(251,191,36,0.06)",
    borderColor: "rgba(251,191,36,0.40)",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  medName: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },

  // приглушённый цвет названия для paused
  medNamePausedText: {
    color: "#CBD5E1",
  },

  // контейнер для “толстого” зачёркивания
  medNameWrap: {
    position: "relative",
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexShrink: 1,
  },

  // толстая линия (цвет как у чипа)
  medNameStrike: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2, // сделай 3 если хочешь ещё жирнее
    backgroundColor: "#FBBF24",
    top: 10, // середина при lineHeight=20
    borderRadius: 2,
  },

  dosage: { color: "#94A3B8", marginTop: 4, fontSize: 13, fontWeight: "800" },

  pauseChipRow: { alignItems: "flex-start" },
  pauseChip: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pauseChipText: {
    color: "#FBBF24",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 0.2,
  },

  periodChip: {
    backgroundColor: "rgba(37,99,235,0.22)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 160,
    marginTop: 2,
  },
  periodChipText: {
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  pausedDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.10)",
  },

  line: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.10)",
  },
  lineLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "900", width: 120 },
  lineValue: {
    flex: 1,
    textAlign: "right",
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },

  notesBox: {
    marginTop: 10,
    backgroundColor: "#0B1220",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  notesLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
  },
  notesText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
