import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  TextInput,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Calendar, LocaleConfig } from "react-native-calendars";

import {
  useMedications,
  type HistoryEntry,
} from "../../components/MedicationsContext";

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
};

type PresetRange = "all" | "today" | "yesterday" | "7d" | "30d";
type RangeState =
  | { type: "preset"; preset: PresetRange }
  | { type: "day"; date: string } // YYYY-MM-DD
  | { type: "range"; from: string; to: string }; // YYYY-MM-DD

// ---- RU locale for calendar
LocaleConfig.locales.ru = {
  monthNames: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  monthNamesShort: [
    "Янв",
    "Фев",
    "Мар",
    "Апр",
    "Май",
    "Июн",
    "Июл",
    "Авг",
    "Сен",
    "Окт",
    "Ноя",
    "Дек",
  ],
  dayNames: [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ],
  dayNamesShort: ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"],
  today: "Сегодня",
};
LocaleConfig.defaultLocale = "ru";

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

function keyToRu(key: string) {
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}.${m}.${y}`;
}

function keyToRuShort(key: string) {
  const [, m, d] = key.split("-");
  if (!m || !d) return key;
  return `${d}.${m}`;
}

function formatDateHeaderRu(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  const weekday = dt.toLocaleDateString("ru-RU", { weekday: "long" });
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const yy = String(y).slice(2);
  return `${weekday}, ${dd}.${mm}.${yy}`;
}

function normalizeTime(t?: string) {
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
}

function presetLabel(p: PresetRange) {
  if (p === "today") return "Сегодня";
  if (p === "yesterday") return "Вчера";
  if (p === "7d") return "7 дней";
  if (p === "30d") return "30 дней";
  return "Всё время";
}

function computeFromTo(rs: RangeState): { from?: string; to?: string } {
  const today = dateKeyFromDate(new Date());

  if (rs.type === "preset") {
    if (rs.preset === "today") return { from: today, to: today };
    if (rs.preset === "yesterday") {
      const y = keyDaysAgo(1);
      return { from: y, to: y };
    }
    if (rs.preset === "7d") return { from: keyDaysAgo(6), to: today };
    if (rs.preset === "30d") return { from: keyDaysAgo(29), to: today };
    return { from: undefined, to: undefined };
  }

  if (rs.type === "day") return { from: rs.date, to: rs.date };

  const from = rs.from <= rs.to ? rs.from : rs.to;
  const to = rs.from <= rs.to ? rs.to : rs.from;
  return { from, to };
}

function daysInclusive(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd, 12, 0, 0);
  const b = new Date(ty, tm - 1, td, 12, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diff) + 1;
}

function rangeDaysCount(rs: RangeState): number | undefined {
  if (rs.type === "preset") {
    if (rs.preset === "today") return 1;
    if (rs.preset === "yesterday") return 1;
    if (rs.preset === "7d") return 7;
    if (rs.preset === "30d") return 30;
    return undefined;
  }
  if (rs.type === "day") return 1;
  const { from, to } = computeFromTo(rs);
  if (!from || !to) return undefined;
  return daysInclusive(from, to);
}

function rangeShortLabel(rs: RangeState) {
  if (rs.type === "preset") return presetLabel(rs.preset);
  if (rs.type === "day") return keyToRu(rs.date);

  const { from, to } = computeFromTo(rs);
  if (!from || !to) return "Период";

  const y1 = from.slice(0, 4);
  const y2 = to.slice(0, 4);

  if (y1 === y2) return `${keyToRuShort(from)}–${keyToRuShort(to)}`;
  return `${keyToRu(from)}–${keyToRu(to)}`;
}

function rangeFullLabel(rs: RangeState) {
  if (rs.type === "preset") return presetLabel(rs.preset);
  if (rs.type === "day") return `День: ${keyToRu(rs.date)}`;

  const { from, to } = computeFromTo(rs);
  if (!from || !to) return "Период";
  const n = daysInclusive(from, to);
  return `Период: ${keyToRu(from)} – ${keyToRu(to)} (${n} дн.)`;
}

function buildMarkedRange(from?: string, to?: string) {
  if (!from && !to) return {};
  if (from && !to) {
    return {
      [from]: {
        startingDay: true,
        endingDay: true,
        color: "rgba(56,189,248,0.28)",
        textColor: COLORS.title,
      },
    };
  }

  if (!from || !to) return {};
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;

  const marked: Record<string, any> = {};
  marked[start] = {
    startingDay: true,
    color: "rgba(56,189,248,0.28)",
    textColor: COLORS.title,
  };
  marked[end] = {
    endingDay: true,
    color: "rgba(56,189,248,0.28)",
    textColor: COLORS.title,
  };

  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const ds = new Date(sy, sm - 1, sd, 12, 0, 0);
  const de = new Date(ey, em - 1, ed, 12, 0, 0);

  const cur = new Date(ds);
  cur.setDate(cur.getDate() + 1);

  while (cur < de) {
    const k = dateKeyFromDate(cur);
    marked[k] = { color: "rgba(56,189,248,0.18)", textColor: COLORS.title };
    cur.setDate(cur.getDate() + 1);
  }

  return marked;
}

// ===== Search + highlight helpers =====
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeTokens(query: string) {
  return query
    .trim()
    .toLocaleLowerCase("ru-RU")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildHighlightRegex(tokens: string[]) {
  if (!tokens.length) return null;
  const pattern = tokens.map(escapeRegExp).join("|");
  return new RegExp(`(${pattern})`, "ig");
}

function highlightText(text: string, re: RegExp | null) {
  if (!re) return text;
  const parts = text.split(re);
  if (parts.length <= 1) return text;

  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <Text key={`${i}-${p}`} style={styles.hl}>
        {p}
      </Text>
    ) : (
      p
    ),
  );
}

function buildSearchHaystack(m: {
  name?: string;
  dosage?: string;
  notes?: string;
}) {
  const name = String(m.name ?? "");
  const dosage = String(m.dosage ?? "");
  const notes = String(m.notes ?? "");
  return `${name} ${dosage} ${notes}`.toLocaleLowerCase("ru-RU");
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

const calendarTheme = {
  calendarBackground: COLORS.surface2,
  textSectionTitleColor: COLORS.muted2,
  monthTextColor: COLORS.title,
  textMonthFontWeight: "900" as any,
  textDayHeaderFontWeight: "900" as any,
  dayTextColor: COLORS.title,
  todayTextColor: COLORS.blue,
  arrowColor: COLORS.blue,
  textDisabledColor: "rgba(148,163,184,0.35)",
  selectedDayTextColor: COLORS.title,
};

export default function HistoryScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { medications, getHistoryEntries } = useMedications();

  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

  const [medSheetOpen, setMedSheetOpen] = useState(false);
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);

  const [dayCalendarOpen, setDayCalendarOpen] = useState(false);
  const [rangeCalendarOpen, setRangeCalendarOpen] = useState(false);

  const [rangeState, setRangeState] = useState<RangeState>({
    type: "preset",
    preset: "all",
  });

  // search
  const [medQuery, setMedQuery] = useState("");

  // temp state for calendars
  const [tempDay, setTempDay] = useState<string>(dateKeyFromDate(new Date()));
  const [tempFrom, setTempFrom] = useState<string | undefined>(undefined);
  const [tempTo, setTempTo] = useState<string | undefined>(undefined);

  const selectedMed = useMemo(() => {
    if (!selectedMedId) return null;
    return medications.find((m) => m.id === selectedMedId) ?? null;
  }, [medications, selectedMedId]);

  const { from, to } = useMemo(() => computeFromTo(rangeState), [rangeState]);
  const daysCount = useMemo(() => rangeDaysCount(rangeState), [rangeState]);

  const isCustomPeriod = rangeState.type !== "preset";
  const periodIconColor = isCustomPeriod ? COLORS.amber : COLORS.blue;

  const entries = useMemo(() => {
    const list = getHistoryEntries({
      medId: selectedMedId ?? undefined,
      from,
      to,
    });
    return list.map((e) => ({ ...e, time: normalizeTime(e.time) }));
  }, [getHistoryEntries, selectedMedId, from, to]);

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();

    for (const e of entries) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }

    const dates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    return dates.map((date) => {
      const items = map.get(date) ?? [];
      items.sort((a, b) => {
        const ta = a.time ?? "";
        const tb = b.time ?? "";
        if (!ta && tb) return 1;
        if (ta && !tb) return -1;
        return ta.localeCompare(tb);
      });
      return { date, items };
    });
  }, [entries]);

  const empty = grouped.length === 0;

  const openDayCalendar = () => {
    setPeriodSheetOpen(false);
    const cur = computeFromTo(rangeState);
    setTempDay(cur.from ?? dateKeyFromDate(new Date()));
    setDayCalendarOpen(true);
  };

  const openRangeCalendar = () => {
    setPeriodSheetOpen(false);
    const cur = computeFromTo(rangeState);
    setTempFrom(cur.from);
    setTempTo(cur.to);
    setRangeCalendarOpen(true);
  };

  const onPickRangeDay = (dayKey: string) => {
    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(dayKey);
      setTempTo(undefined);
      return;
    }
    setTempTo(dayKey);
  };

  const isPresetActive = (p: PresetRange) =>
    rangeState.type === "preset" && rangeState.preset === p;

  const rangeChipText = rangeShortLabel(rangeState);
  const rangeSummaryText = rangeFullLabel(rangeState);

  // tokens + regex for highlight
  const tokens = useMemo(() => makeTokens(medQuery), [medQuery]);
  const hlRe = useMemo(() => buildHighlightRegex(tokens), [tokens]);

  // meds filtered by name/dosage/notes
  const medsForPicker = useMemo(() => {
    const list = medications
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (!tokens.length) return list;

    return list.filter((m) => {
      const hay = buildSearchHaystack(m);
      return tokens.every((t) => hay.includes(t));
    });
  }, [medications, tokens]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>История приёма</Text>

        <View style={styles.filtersCol}>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => {
              setMedQuery("");
              setMedSheetOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="medkit-outline" size={16} color={COLORS.blue} />
            <Text style={styles.filterText} numberOfLines={1}>
              {selectedMed ? selectedMed.name : "Все лекарства"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.muted2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              isCustomPeriod && styles.filterChipCustom,
            ]}
            onPress={() => setPeriodSheetOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={periodIconColor}
            />
            <Text style={styles.filterText} numberOfLines={1}>
              {rangeChipText}
            </Text>

            {typeof daysCount === "number" ? (
              <View
                style={[
                  styles.daysBadge,
                  isCustomPeriod && styles.daysBadgeCustom,
                ]}
              >
                <Text style={styles.daysBadgeText}>{daysCount}д</Text>
              </View>
            ) : null}

            <Ionicons name="chevron-down" size={16} color={COLORS.muted2} />
          </TouchableOpacity>

          <View style={styles.summaryBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={COLORS.muted2}
            />
            <Text style={styles.summaryText} numberOfLines={2}>
              {rangeSummaryText}
            </Text>
          </View>
        </View>
      </View>

      <HeaderFade />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 },
        ]}
      >
        {empty ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={18} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              История пока пустая. Отметь приёмы на вкладке “Домой”, и они
              появятся здесь.
            </Text>
          </View>
        ) : (
          grouped.map((g) => (
            <View key={g.date} style={styles.dayBlock}>
              <Text style={styles.dayHeader}>{formatDateHeaderRu(g.date)}</Text>

              <View style={styles.dayList}>
                {g.items.map((it, idx) => {
                  const med = medications.find((m) => m.id === it.medId);
                  const name = med?.name ?? "Удалено";
                  const dosage = med?.dosage ?? "—";

                  const isTaken = it.status === "taken";
                  const isSkipped = it.status === "skipped";

                  return (
                    <View
                      key={`${it.date}-${it.medId}-${it.time ?? "no-time"}-${idx}`}
                      style={[styles.row, idx > 0 && styles.rowBorder]}
                    >
                      <View style={styles.leftIcon}>
                        <Ionicons
                          name="medical-outline"
                          size={18}
                          color={COLORS.blue}
                        />
                      </View>

                      <View style={styles.center}>
                        <Text style={styles.name} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.dosage} numberOfLines={1}>
                          {dosage}
                        </Text>
                      </View>

                      <View style={styles.right}>
                        <Text
                          style={[
                            styles.time,
                            isTaken && styles.timeTaken,
                            isSkipped && styles.timeSkipped,
                          ]}
                        >
                          {it.time || "—"}
                        </Text>

                        {isTaken ? (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={COLORS.green}
                          />
                        ) : isSkipped ? (
                          <Ionicons
                            name="close"
                            size={20}
                            color={COLORS.orange}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ===== Sheet: лекарства + поиск + highlight ===== */}
      <Modal
        visible={medSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMedSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setMedSheetOpen(false);
          }}
        />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet} pointerEvents="auto">
            <Text style={styles.sheetTitle}>Фильтр: лекарства</Text>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={COLORS.muted2} />
              <TextInput
                value={medQuery}
                onChangeText={setMedQuery}
                placeholder="Поиск…"
                placeholderTextColor={COLORS.muted2}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {medQuery.trim() ? (
                <TouchableOpacity onPress={() => setMedQuery("")} hitSlop={10}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.muted2}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ✅ подсказка показывается только когда строка поиска пустая */}
            {!medQuery.trim() ? (
              <Text style={styles.searchHint}>
                Поиск по названию, дозировке и заметкам
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                Keyboard.dismiss();
                setSelectedMedId(null);
                setMedQuery("");
                setMedSheetOpen(false);
              }}
            >
              <Text style={styles.sheetItemText}>Все лекарства</Text>
              {!selectedMedId ? (
                <Ionicons name="checkmark" size={18} color={COLORS.blue} />
              ) : null}
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
            >
              {medsForPicker.length === 0 ? (
                <View style={styles.noResults}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={COLORS.muted2}
                  />
                  <Text style={styles.noResultsText}>Ничего не найдено</Text>
                </View>
              ) : (
                medsForPicker.map((m) => {
                  const dosage = String(m.dosage ?? "").trim();
                  const notes = String((m as any).notes ?? "").trim();

                  const sub = [dosage || "—", notes ? `• ${notes}` : ""]
                    .filter(Boolean)
                    .join(" ")
                    .slice(0, 120);

                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.sheetItemMulti}
                      onPress={() => {
                        Keyboard.dismiss(); // ✅ скрыть клавиатуру
                        setSelectedMedId(m.id);
                        setMedQuery("");
                        setMedSheetOpen(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetItemText} numberOfLines={1}>
                          {highlightText(m.name, hlRe)}
                        </Text>

                        <Text style={styles.sheetItemSubText} numberOfLines={2}>
                          {highlightText(sub, hlRe)}
                        </Text>
                      </View>

                      {selectedMedId === m.id ? (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={COLORS.blue}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => {
                Keyboard.dismiss();
                setMedSheetOpen(false);
              }}
            >
              <Text style={styles.sheetCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== Sheet: период ===== */}
      <Modal
        visible={periodSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setPeriodSheetOpen(false)}
        />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet} pointerEvents="auto">
            <Text style={styles.sheetTitle}>Фильтр: период</Text>

            <View style={styles.sheetHintBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={COLORS.muted2}
              />
              <Text style={styles.sheetHintText}>{rangeSummaryText}</Text>
            </View>

            {(["today", "yesterday", "7d", "30d", "all"] as PresetRange[]).map(
              (p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.sheetItem,
                    isPresetActive(p) && styles.sheetItemActive,
                  ]}
                  onPress={() => {
                    setRangeState({ type: "preset", preset: p });
                    setPeriodSheetOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sheetItemText}>{presetLabel(p)}</Text>
                  {isPresetActive(p) ? (
                    <Ionicons name="checkmark" size={18} color={COLORS.blue} />
                  ) : null}
                </TouchableOpacity>
              ),
            )}

            <View style={styles.sheetDivider} />

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={openDayCalendar}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetItemText}>
                Выбрать день (календарь)…
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.muted2}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={openRangeCalendar}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetItemText}>
                Выбрать период (календарь)…
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.muted2}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setPeriodSheetOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== Calendar: choose day ===== */}
      <Modal
        visible={dayCalendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDayCalendarOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setDayCalendarOpen(false)}
        />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.calendarSheet} pointerEvents="auto">
            <Text style={styles.sheetTitle}>Выбрать день</Text>

            <View style={styles.calendarInfoRow}>
              <Text style={styles.calendarInfoText}>
                Выбрано: {keyToRu(tempDay)}
              </Text>
            </View>

            <Calendar
              firstDay={1}
              current={tempDay}
              onDayPress={(d) => setTempDay(d.dateString)}
              markedDates={{
                [tempDay]: {
                  selected: true,
                  selectedColor: "rgba(56,189,248,0.35)",
                },
              }}
              theme={calendarTheme}
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionPrimary}
                onPress={() => {
                  setRangeState({ type: "day", date: tempDay });
                  setDayCalendarOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.actionPrimaryText}>Применить</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSecondary}
                onPress={() => setDayCalendarOpen(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionSecondaryText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== Calendar: choose range ===== */}
      <Modal
        visible={rangeCalendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRangeCalendarOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setRangeCalendarOpen(false)}
        />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.calendarSheet} pointerEvents="auto">
            <Text style={styles.sheetTitle}>Выбрать период</Text>

            <View style={styles.calendarInfoRow}>
              {tempFrom && tempTo ? (
                <Text style={styles.calendarInfoText}>
                  Выбрано: {keyToRu(tempFrom)} – {keyToRu(tempTo)} (
                  {daysInclusive(tempFrom, tempTo)} дн.)
                </Text>
              ) : tempFrom ? (
                <Text style={styles.calendarInfoText}>
                  Начало: {keyToRu(tempFrom)} • выбери дату окончания
                </Text>
              ) : (
                <Text style={styles.calendarInfoText}>Выбери дату начала</Text>
              )}
            </View>

            <Calendar
              firstDay={1}
              current={tempFrom ?? dateKeyFromDate(new Date())}
              onDayPress={(d) => onPickRangeDay(d.dateString)}
              markingType="period"
              markedDates={buildMarkedRange(tempFrom, tempTo)}
              theme={calendarTheme}
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionSecondary, { flex: 1 }]}
                onPress={() => {
                  setTempFrom(undefined);
                  setTempTo(undefined);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.actionSecondaryText}>Сбросить</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionPrimary,
                  { flex: 1, opacity: tempFrom && tempTo ? 1 : 0.55 },
                ]}
                disabled={!tempFrom || !tempTo}
                onPress={() => {
                  if (!tempFrom || !tempTo) return;
                  setRangeState({ type: "range", from: tempFrom, to: tempTo });
                  setRangeCalendarOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.actionPrimaryText}>Применить</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setRangeCalendarOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {Platform.OS === "web" ? <View style={{ height: 0 }} /> : null}
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

  filtersCol: { marginTop: 10, gap: 10 },

  filterChip: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterChipCustom: {
    backgroundColor: "rgba(251,191,36,0.10)",
    borderColor: "rgba(251,191,36,0.35)",
  },

  filterText: { flex: 1, color: COLORS.title, fontWeight: "800", fontSize: 12 },

  daysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.16)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.28)",
  },
  daysBadgeCustom: {
    backgroundColor: "rgba(251,191,36,0.16)",
    borderColor: "rgba(251,191,36,0.30)",
  },
  daysBadgeText: { color: COLORS.title, fontWeight: "900", fontSize: 10 },

  summaryBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryText: {
    flex: 1,
    color: COLORS.muted,
    fontWeight: "700",
    lineHeight: 18,
  },

  content: { padding: 16 },

  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  emptyText: {
    flex: 1,
    color: COLORS.muted,
    fontWeight: "700",
    lineHeight: 18,
  },

  dayBlock: { marginBottom: 14 },
  dayHeader: {
    color: COLORS.muted,
    fontWeight: "900",
    fontSize: 16,
    textTransform: "lowercase",
    marginBottom: 10,
  },

  dayList: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },

  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.10)" },

  leftIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  center: { flex: 1 },
  name: { color: COLORS.title, fontWeight: "900", fontSize: 15 },
  dosage: {
    marginTop: 4,
    color: COLORS.muted,
    fontWeight: "800",
    fontSize: 12,
  },

  right: { alignItems: "flex-end", gap: 6, minWidth: 80 },
  time: { color: COLORS.title, fontWeight: "900", fontSize: 14 },
  timeTaken: { color: COLORS.green },
  timeSkipped: { color: COLORS.orange },

  // highlight
  hl: { color: COLORS.amber, fontWeight: "900" },

  // sheets
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

  calendarSheet: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sheetTitle: { color: COLORS.title, fontSize: 16, fontWeight: "900" },

  searchBox: {
    marginTop: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.title,
    fontWeight: "800",
    paddingVertical: 0,
  },
  searchHint: {
    marginTop: 8,
    color: COLORS.muted2,
    fontWeight: "700",
    lineHeight: 18,
  },

  noResults: {
    marginTop: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noResultsText: { color: COLORS.muted, fontWeight: "800" },

  sheetHintBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  sheetHintText: {
    flex: 1,
    color: COLORS.muted,
    fontWeight: "700",
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

  sheetItemMulti: {
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
    gap: 10,
  },

  sheetItemActive: {
    borderColor: "rgba(56,189,248,0.35)",
    backgroundColor: "rgba(56,189,248,0.10)",
  },

  sheetItemText: { color: COLORS.title, fontWeight: "800" },
  sheetItemSubText: {
    marginTop: 6,
    color: COLORS.muted,
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 16,
  },

  sheetDivider: { height: 10 },

  sheetCancel: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  sheetCancelText: { color: COLORS.title, fontWeight: "900" },

  calendarInfoRow: {
    marginTop: 10,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarInfoText: { color: COLORS.title, fontWeight: "800", lineHeight: 18 },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionPrimary: {
    flex: 1,
    backgroundColor: "rgba(56,189,248,0.18)",
    borderColor: "rgba(56,189,248,0.35)",
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  actionPrimaryText: { color: COLORS.title, fontWeight: "900", fontSize: 12 },

  actionSecondary: {
    flex: 1,
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  actionSecondaryText: { color: COLORS.title, fontWeight: "900", fontSize: 12 },
});
