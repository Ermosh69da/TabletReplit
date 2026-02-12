import { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import {
  useMedications,
  type RepeatMode,
  type Period,
} from "../../../components/MedicationsContext";

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ruDateFromKey(key: string) {
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}.${m}.${y}`;
}

function dateFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

function formatTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeTime(t: string) {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
}

// Домой использует period — вычисляем по первому времени
function periodFromTime(time: string): Period {
  const h = Number(time.split(":")[0] ?? 0);
  if (h >= 5 && h <= 11) return "morning";
  if (h >= 12 && h <= 17) return "day";
  return "evening";
}

/**
 * startDate в режиме "weekdays" всегда ближайшая к СЕГОДНЯ:
 * - если сегодня выбран -> сегодня
 * - иначе ближайший следующий выбранный день
 */
function nextStartDateFromToday(weekdays: number[]) {
  if (!weekdays || weekdays.length === 0) return dateKey();

  const d = new Date();
  d.setHours(12, 0, 0, 0);

  for (let i = 0; i <= 14; i++) {
    const dow = d.getDay(); // 0..6
    if (weekdays.includes(dow)) return dateKey(d);
    d.setDate(d.getDate() + 1);
  }

  return dateKey();
}

function dowShortRuFromKey(key: string) {
  const d = dateFromKey(key);
  const map = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
  return map[d.getDay()] ?? "—";
}

const DOW = [
  { key: 1, label: "ПН" },
  { key: 2, label: "ВТ" },
  { key: 3, label: "СР" },
  { key: 4, label: "ЧТ" },
  { key: 5, label: "ПТ" },
  { key: 6, label: "СБ" },
  { key: 0, label: "ВС" },
] as const;

export default function NewMedicationScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { addMedication } = useMedications();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [notes, setNotes] = useState("");

  // times
  const initialTime = useMemo(() => {
    const d = new Date();
    d.setHours(9);
    d.setMinutes(0);
    d.setSeconds(0);
    return d;
  }, []);
  const [timeDate, setTimeDate] = useState<Date>(initialTime);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [times, setTimes] = useState<string[]>(["09:00"]);

  // web time modal fallback
  const [webTimeOpen, setWebTimeOpen] = useState(false);
  const [webTimeDraft, setWebTimeDraft] = useState(times[0] ?? "09:00");

  const addPickedTime = (t: string) => {
    const v = normalizeTime(t);
    if (!v) return;
    setTimes((prev) => Array.from(new Set([...prev, v])).sort());
  };

  const removeTime = (t: string) => {
    setTimes((prev) => prev.filter((x) => x !== t));
  };

  const openTimePicker = () => {
    if (Platform.OS === "web") {
      setWebTimeDraft(times[0] ?? "09:00");
      setWebTimeOpen(true);
    } else {
      setShowTimePicker(true);
    }
  };

  // repeat
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("daily");

  const [startDate, setStartDate] = useState<string>(dateKey());
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);

  // web start date modal fallback (используем только в daily)
  const [webStartOpen, setWebStartOpen] = useState(false);
  const [webStartDraft, setWebStartDraft] = useState(startDate);

  const openStartDatePicker = () => {
    if (Platform.OS === "web") {
      setWebStartDraft(startDate);
      setWebStartOpen(true);
    } else {
      setStartDatePickerOpen(true);
    }
  };

  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [dates, setDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const canSave = name.trim().length > 0 && times.length > 0;

  // auto-start only for weekdays
  useEffect(() => {
    if (repeatMode !== "weekdays") return;
    if (!weekdays || weekdays.length === 0) return;

    const next = nextStartDateFromToday(weekdays);
    setStartDate((prev) => (prev === next ? prev : next));
  }, [repeatMode, weekdays]);

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const toggleDate = (key: string) => {
    setDates((prev) =>
      prev.includes(key)
        ? prev.filter((x) => x !== key)
        : [...prev, key].sort(),
    );
  };

  const markedDates = useMemo(() => {
    const obj: Record<string, any> = {};
    for (const d of dates)
      obj[d] = { selected: true, selectedColor: "#2563EB" };
    const today = dateKey();
    if (!obj[today]) obj[today] = { marked: true, dotColor: "#38BDF8" };
    return obj;
  }, [dates]);

  const autoStartHint = useMemo(() => {
    if (repeatMode !== "weekdays") return "";
    return `Ближайший приём: ${dowShortRuFromKey(startDate)} (${ruDateFromKey(startDate)})`;
  }, [repeatMode, startDate]);

  const onSave = () => {
    if (!canSave) return;

    const sortedTimes = [...times].sort();
    const firstTime = sortedTimes[0];

    addMedication({
      name: name.trim(),
      dosage: dosage.trim(),

      time: firstTime,
      times: sortedTimes,
      period: periodFromTime(firstTime),

      notes: notes.trim(),

      repeat: repeatMode,
      startDate: repeatMode === "dates" ? undefined : startDate,
      weekdays:
        repeatMode === "weekdays"
          ? weekdays.length
            ? weekdays
            : [0, 1, 2, 3, 4, 5, 6]
          : undefined,
      dates:
        repeatMode === "dates"
          ? dates.length
            ? dates
            : [dateKey()]
          : undefined,
    });

    router.replace("/medications");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.sideBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#3B82F6" />
          <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Новое лекарство</Text>

        <TouchableOpacity
          style={[styles.saveTopBtn, !canSave && styles.saveTopBtnDisabled]}
          onPress={onSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.saveTopText, !canSave && styles.saveTopTextDisabled]}
          >
            Сохранить
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>
          <Ionicons name="pricetag-outline" size={14} color="#9CA3AF" />{" "}
          Название
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Например: Аспирин"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />

        <Text style={styles.label}>
          <Ionicons name="barbell-outline" size={14} color="#9CA3AF" />{" "}
          Дозировка
        </Text>
        <TextInput
          value={dosage}
          onChangeText={setDosage}
          placeholder="1 таблетка / 75 мг"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />

        <Text style={styles.label}>
          <Ionicons name="alarm-outline" size={14} color="#9CA3AF" /> Время
          приёма (можно несколько)
        </Text>

        <View style={styles.timesWrap}>
          {times.map((t) => (
            <View key={t} style={styles.timeChip}>
              <Text style={styles.timeChipText}>{t}</Text>
              <TouchableOpacity onPress={() => removeTime(t)} hitSlop={10}>
                <Ionicons name="close" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addTimeChip}
            onPress={openTimePicker}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#0B1220" />
            <Text style={styles.addTimeText}>Добавить</Text>
          </TouchableOpacity>
        </View>

        {/* Native time picker */}
        {showTimePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={timeDate}
            mode="time"
            is24Hour
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, selected) => {
              setShowTimePicker(false);
              if (selected) {
                setTimeDate(selected);
                addPickedTime(formatTime(selected));
              }
            }}
          />
        )}

        {/* Repeat */}
        <Text style={[styles.label, { marginTop: 18 }]}>
          <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />{" "}
          Периодичность приёма
        </Text>

        <View style={styles.repeatRow}>
          <TouchableOpacity
            onPress={() => setRepeatMode("daily")}
            style={[
              styles.repeatBtn,
              repeatMode === "daily" && styles.repeatBtnActive,
            ]}
          >
            <Text
              style={[
                styles.repeatText,
                repeatMode === "daily" && styles.repeatTextActive,
              ]}
            >
              Ежедневно
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRepeatMode("weekdays")}
            style={[
              styles.repeatBtn,
              repeatMode === "weekdays" && styles.repeatBtnActive,
            ]}
          >
            <Text
              style={[
                styles.repeatText,
                repeatMode === "weekdays" && styles.repeatTextActive,
              ]}
            >
              По дням
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRepeatMode("dates")}
            style={[
              styles.repeatBtn,
              repeatMode === "dates" && styles.repeatBtnActive,
            ]}
          >
            <Text
              style={[
                styles.repeatText,
                repeatMode === "dates" && styles.repeatTextActive,
              ]}
            >
              По датам
            </Text>
          </TouchableOpacity>
        </View>

        {/* DAILY: старт редактируемый */}
        {repeatMode === "daily" && (
          <>
            <TouchableOpacity
              style={styles.startRow}
              onPress={openStartDatePicker}
              activeOpacity={0.85}
            >
              <Text style={styles.startText}>
                Начало: ({ruDateFromKey(startDate)})
              </Text>
              <Ionicons name="calendar" size={18} color="#60A5FA" />
            </TouchableOpacity>

            {startDatePickerOpen && Platform.OS !== "web" && (
              <DateTimePicker
                value={dateFromKey(startDate)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selected) => {
                  setStartDatePickerOpen(false);
                  if (selected) setStartDate(dateKey(selected));
                }}
              />
            )}
          </>
        )}

        {/* WEEKDAYS: старт авто, НЕ редактируемый + информативная подсказка */}
        {repeatMode === "weekdays" && (
          <>
            <View style={[styles.startRow, styles.startRowDisabled]}>
              <Text style={styles.startText}>
                Начало (авто): ({ruDateFromKey(startDate)})
              </Text>
              <Ionicons name="sync-outline" size={18} color="#64748B" />
            </View>
            <Text style={styles.autoHint}>{autoStartHint}</Text>

            <View style={styles.weekdaysRow}>
              {DOW.map((d) => {
                const active = weekdays.includes(d.key);
                return (
                  <TouchableOpacity
                    key={d.key}
                    onPress={() => toggleWeekday(d.key)}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        active && styles.dayChipTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* DATES */}
        {repeatMode === "dates" && (
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity
              style={styles.pickDatesBtn}
              onPress={() => setCalendarOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.pickDatesText}>
                Выбрать даты ({dates.length})
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#60A5FA" />
            </TouchableOpacity>

            {dates.length > 0 ? (
              <View style={styles.datesWrap}>
                {dates.map((d) => (
                  <View key={d} style={styles.dateChip}>
                    <Text style={styles.dateChipText}>{ruDateFromKey(d)}</Text>
                    <TouchableOpacity
                      onPress={() => toggleDate(d)}
                      hitSlop={10}
                    >
                      <Ionicons name="close" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.hintText}>
                Выбери одну или несколько дат в календаре
              </Text>
            )}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 18 }]}>
          <Ionicons name="document-text-outline" size={14} color="#9CA3AF" />{" "}
          Заметки
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="После еды..."
          placeholderTextColor="#6B7280"
          style={[styles.input, styles.notes]}
          multiline
        />
      </ScrollView>

      {/* Calendar modal */}
      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setCalendarOpen(false)}
        />
        <View style={styles.calendarWrap}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Выбор дат</Text>
              <TouchableOpacity
                onPress={() => setCalendarOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Calendar
              markedDates={markedDates}
              onDayPress={(day) => toggleDate(day.dateString)}
              theme={{
                backgroundColor: "#0E1629",
                calendarBackground: "#0E1629",
                dayTextColor: "#E5E7EB",
                monthTextColor: "#E5E7EB",
                textSectionTitleColor: "#94A3B8",
                todayTextColor: "#38BDF8",
                arrowColor: "#38BDF8",
              }}
            />

            <View style={styles.calendarActions}>
              <TouchableOpacity
                style={styles.calendarBtnGhost}
                onPress={() => setDates([])}
                activeOpacity={0.85}
              >
                <Text style={styles.calendarBtnGhostText}>Очистить</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarBtn}
                onPress={() => setCalendarOpen(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.calendarBtnText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Web time picker modal */}
      <Modal
        visible={webTimeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWebTimeOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setWebTimeOpen(false)}
        />
        <View style={styles.webPickerWrap}>
          <View style={styles.webPickerCard}>
            <View style={styles.webPickerHeader}>
              <Text style={styles.webPickerTitle}>Выбор времени</Text>
              <TouchableOpacity
                onPress={() => setWebTimeOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {Platform.OS === "web" ? (
              // eslint-disable-next-line react-native/no-raw-text
              <input
                type="time"
                value={webTimeDraft}
                onChange={(e: any) => setWebTimeDraft(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.14)",
                  background: "#0B1220",
                  color: "#E5E7EB",
                  fontSize: 16,
                }}
              />
            ) : null}

            <TouchableOpacity
              style={[styles.calendarBtn, { marginTop: 12 }]}
              onPress={() => {
                addPickedTime(webTimeDraft);
                setWebTimeOpen(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.calendarBtnText}>Добавить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Web start date picker modal (daily) */}
      <Modal
        visible={webStartOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWebStartOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setWebStartOpen(false)}
        />
        <View style={styles.webPickerWrap}>
          <View style={styles.webPickerCard}>
            <View style={styles.webPickerHeader}>
              <Text style={styles.webPickerTitle}>Дата начала</Text>
              <TouchableOpacity
                onPress={() => setWebStartOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {Platform.OS === "web" ? (
              // eslint-disable-next-line react-native/no-raw-text
              <input
                type="date"
                value={webStartDraft}
                onChange={(e: any) => setWebStartDraft(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.14)",
                  background: "#0B1220",
                  color: "#E5E7EB",
                  fontSize: 16,
                }}
              />
            ) : null}

            <TouchableOpacity
              style={[styles.calendarBtn, { marginTop: 12 }]}
              onPress={() => {
                if (webStartDraft) setStartDate(webStartDraft);
                setWebStartOpen(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.calendarBtnText}>Готово</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050B18",
    paddingTop: 50,
    paddingHorizontal: 16,
  },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sideBtn: { width: 84, flexDirection: "row", alignItems: "center" },
  backText: { color: "#3B82F6", fontSize: 16, marginLeft: 4 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  saveTopBtn: { width: 84, alignItems: "flex-end", justifyContent: "center" },
  saveTopBtnDisabled: { opacity: 0.5 },
  saveTopText: { color: "#38BDF8", fontSize: 16, fontWeight: "800" },
  saveTopTextDisabled: { color: "#64748B" },

  scrollContent: { paddingBottom: 10 },

  label: {
    color: "#9CA3AF",
    marginTop: 14,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#0E1629",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    color: "#FFFFFF",
    fontSize: 16,
  },

  timesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0E1629",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  timeChipText: { color: "#E5E7EB", fontWeight: "900", fontSize: 12 },

  addTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#38BDF8",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addTimeText: { color: "#0B1220", fontWeight: "900", fontSize: 12 },

  repeatRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  repeatBtn: {
    flex: 1,
    backgroundColor: "#0E1629",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  repeatBtnActive: {
    backgroundColor: "rgba(56,189,248,0.12)",
    borderColor: "rgba(56,189,248,0.45)",
  },
  repeatText: { color: "#94A3B8", fontWeight: "800", fontSize: 12 },
  repeatTextActive: { color: "#38BDF8" },

  startRow: {
    marginTop: 10,
    backgroundColor: "#0E1629",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  startRowDisabled: { opacity: 0.9 },
  startText: { color: "#E5E7EB", fontWeight: "700", fontSize: 13 },

  autoHint: {
    marginTop: 8,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },

  weekdaysRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    backgroundColor: "#0E1629",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  dayChipActive: {
    backgroundColor: "rgba(37,99,235,0.26)",
    borderColor: "rgba(56,189,248,0.55)",
  },
  dayChipText: { color: "#94A3B8", fontWeight: "900", fontSize: 12 },
  dayChipTextActive: { color: "#E5E7EB" },

  pickDatesBtn: {
    backgroundColor: "#0E1629",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickDatesText: { color: "#E5E7EB", fontWeight: "800" },
  hintText: { marginTop: 8, color: "#64748B", fontSize: 12, fontWeight: "700" },

  datesWrap: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0E1629",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  dateChipText: { color: "#E5E7EB", fontWeight: "800", fontSize: 12 },

  notes: { height: 100, textAlignVertical: "top" },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  calendarWrap: { flex: 1, justifyContent: "flex-end", padding: 16 },
  calendarCard: {
    backgroundColor: "#0E1629",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    overflow: "hidden",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  calendarTitle: { color: "#E5E7EB", fontWeight: "900", fontSize: 16 },
  calendarActions: { flexDirection: "row", gap: 10, padding: 14 },
  calendarBtnGhost: {
    flex: 1,
    backgroundColor: "#0B1220",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  calendarBtnGhostText: { color: "#94A3B8", fontWeight: "900" },
  calendarBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  calendarBtnText: { color: "#FFFFFF", fontWeight: "900" },

  webPickerWrap: { flex: 1, justifyContent: "flex-end", padding: 16 },
  webPickerCard: {
    backgroundColor: "#0E1629",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  webPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  webPickerTitle: { color: "#E5E7EB", fontWeight: "900", fontSize: 16 },
});
