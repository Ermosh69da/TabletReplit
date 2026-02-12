import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useMemo } from "react";

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

/** 1) берём времена из m.times[], если оно есть
 * 2) иначе вытаскиваем все HH:MM из строки m.time (на случай "09:00 • 15:21")
 */
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

  // если там было одно значение без совпадения — попробуем вернуть как есть
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

  // порядок как в табах: утро -> день -> вечер
  const order: Period[] = ["morning", "day", "evening"];
  periods.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return periods.map((p) => periodLabel(p).toUpperCase()).join(", ");
}

export default function MedicationsScreen() {
  const { medications } = useMedications();

  const list = useMemo(() => {
    return [...medications].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [medications]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Мои лекарства</Text>

          <Link href="/medications/new" asChild>
            <TouchableOpacity style={styles.addButton} activeOpacity={0.85}>
              <Ionicons name="add" size={24} color="#0B1220" />
            </TouchableOpacity>
          </Link>
        </View>

        {/* LIST */}
        {list.map((m) => {
          const rep = repeatLine(m);
          const times = getTimes(m);
          const timesText = times.length ? times.join(" • ") : "—";
          const chipText = periodChipFromTimes(times, m.period);

          return (
            <View key={m.id} style={styles.card}>
              {/* Top */}
              <View style={styles.topRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="medical-outline" size={18} color="#38BDF8" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.dosage}>{m.dosage || "—"}</Text>
                </View>

                <View style={styles.periodChip}>
                  <Text style={styles.periodChipText}>{chipText}</Text>
                </View>
              </View>

              {/* Time */}
              <View style={styles.line}>
                <Text style={styles.lineLabel}>Время приёма:</Text>
                <Text style={styles.lineValue}>{timesText}</Text>
              </View>

              {/* Repeat */}
              <View style={styles.line}>
                <Text style={styles.lineLabel}>{rep.label}</Text>
                {rep.value ? (
                  <Text style={styles.lineValue}>{rep.value}</Text>
                ) : null}
              </View>

              {/* Start */}
              <View style={styles.line}>
                <Text style={styles.lineLabel}>Начало приёма:</Text>
                <Text style={styles.lineValue}>{getStartDateLabel(m)}</Text>
              </View>

              {/* Notes */}
              {!!m.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Заметки</Text>
                  <Text style={styles.notesText}>{m.notes}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050B18" },
  content: { padding: 16, paddingBottom: 40 },

  header: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: { color: "#E5E7EB", fontSize: 20, fontWeight: "900" },
  addButton: { backgroundColor: "#38BDF8", borderRadius: 12, padding: 10 },

  card: {
    backgroundColor: "#0E1629",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
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
  },

  medName: { color: "#F8FAFC", fontSize: 16, fontWeight: "900" },
  dosage: { color: "#94A3B8", marginTop: 4, fontSize: 13, fontWeight: "800" },

  periodChip: {
    backgroundColor: "rgba(37,99,235,0.22)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 140,
  },
  periodChipText: {
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
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
  lineLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "900",
    width: 120,
  },
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
