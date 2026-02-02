import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

type Frequency = "daily" | "weekdays" | "dates";

const DAYS_OF_WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function NewMedicationScreen() {
  const router = useRouter();
  const today = new Date();

  // --- СОСТОЯНИЯ ---
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [specificDates, setSpecificDates] = useState<Date[]>([]);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"startDate" | "addDate">(
    "startDate",
  );

  // --- ЛОГИКА ---

  // Явный переход на список лекарств при нажатии "Назад"
  const handleBack = () => {
    router.navigate("/(tabs)/medications");
  };

  const handleTypePress = (type: Frequency) => {
    setFrequency(type);
    setIsEditing(true);
  };

  const onChangeDate = (event: any, date?: Date) => {
    setShowPicker(false);
    if (!date) return;

    if (pickerMode === "startDate") {
      setStartDate(date);
      setIsEditing(false);
    } else {
      const exists = specificDates.some(
        (d) => d.toDateString() === date.toDateString(),
      );
      if (!exists) {
        setSpecificDates([...specificDates, date]);
      }
    }
  };

  const toggleWeekday = (index: number) => {
    if (selectedWeekdays.includes(index)) {
      setSelectedWeekdays(selectedWeekdays.filter((i) => i !== index));
    } else {
      setSelectedWeekdays([...selectedWeekdays, index]);
    }
  };

  const removeSpecificDate = (dateToRemove: Date) => {
    setSpecificDates(specificDates.filter((d) => d !== dateToRemove));
  };

  // --- ФОРМИРОВАНИЕ СТРОКИ ИТОГА ---
  const getSummaryText = () => {
    if (!frequency) return "";

    if (frequency === "daily") {
      if (!startDate) return "Нажмите, чтобы настроить дату начала";

      // Логика: если дата сегодня, пишем "сегодня (ДД.ММ.ГГГГ)"
      const isToday = startDate.toDateString() === today.toDateString();
      const dateStr = isToday
        ? `сегодня (${startDate.toLocaleDateString()})`
        : startDate.toLocaleDateString();

      return `Ежедневно • Начало: ${dateStr}`;
    }

    if (frequency === "weekdays") {
      if (selectedWeekdays.length === 0) return "Дни недели не выбраны";
      const sortedDays = [...selectedWeekdays].sort((a, b) => a - b);
      const daysStr = sortedDays.map((i) => DAYS_OF_WEEK[i]).join(", ");
      return `По дням: ${daysStr}`;
    }

    if (frequency === "dates") {
      if (specificDates.length === 0) return "Даты не выбраны";
      if (specificDates.length === 1)
        return `Один приём: ${specificDates[0].toLocaleDateString()}`;
      return `Выбрано дат: ${specificDates.length}`;
    }

    return "";
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Изменен обработчик onPress */}
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
          <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новое лекарство</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={styles.label}>💊 Название</Text>
        <TextInput
          placeholder="Например: Аспирин"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />

        <Text style={styles.label}>⚖️ Дозировка</Text>
        <TextInput
          placeholder="1 таблетка"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />

        <Text style={styles.label}>⏰ Время приёма</Text>
        <View style={styles.input}>
          <Text style={styles.timeText}>21:35</Text>
        </View>

        <Text style={styles.label}>📅 Периодичность приёма</Text>

        <View style={styles.frequencyRow}>
          <FrequencyButton
            text="Ежедневно"
            active={frequency === "daily"}
            onPress={() => handleTypePress("daily")}
          />
          <FrequencyButton
            text="По дням"
            active={frequency === "weekdays"}
            onPress={() => handleTypePress("weekdays")}
          />
          <FrequencyButton
            text="По датам"
            active={frequency === "dates"}
            onPress={() => handleTypePress("dates")}
          />
        </View>

        {/* СТРОКА ИТОГА */}
        {frequency && !isEditing && (
          <TouchableOpacity
            style={styles.summaryRow}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.summaryText}>{getSummaryText()}</Text>
            <Ionicons name="create-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        )}

        {/* --- НАСТРОЙКИ --- */}

        {/* 1. ЕЖЕДНЕВНО */}
        {isEditing && frequency === "daily" && (
          <View style={styles.selectionBox}>
            <Text style={styles.selectionTitle}>Когда начать прием?</Text>
            <View style={styles.dailyOptionsRow}>
              <TouchableOpacity
                style={styles.dailyOptionBtn}
                onPress={() => {
                  setStartDate(today);
                  setIsEditing(false);
                }}
              >
                <Ionicons name="today-outline" size={20} color="#3B82F6" />
                <Text style={styles.dailyOptionText}>Начать сегодня</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dailyOptionBtn}
                onPress={() => {
                  setPickerMode("startDate");
                  setShowPicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                <Text style={styles.dailyOptionText}>Выбрать дату</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 2. ПО ДНЯМ */}
        {isEditing && frequency === "weekdays" && (
          <View style={styles.selectionBox}>
            <Text style={styles.selectionTitle}>Выберите дни недели:</Text>
            <View style={styles.weekdaysRow}>
              {DAYS_OF_WEEK.map((day, index) => {
                const isSelected = selectedWeekdays.includes(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.weekdayBtn,
                      isSelected && styles.weekdayBtnActive,
                    ]}
                    onPress={() => toggleWeekday(index)}
                  >
                    <Text
                      style={[
                        styles.weekdayText,
                        isSelected && styles.weekdayTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.doneButtonText}>Готово</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. ПО ДАТАМ */}
        {isEditing && frequency === "dates" && (
          <View style={styles.selectionBox}>
            <Text style={styles.selectionTitle}>Даты приемов:</Text>
            <TouchableOpacity
              style={styles.addDateButton}
              onPress={() => {
                setPickerMode("addDate");
                setShowPicker(true);
              }}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Добавить дату
              </Text>
            </TouchableOpacity>

            <View style={styles.datesList}>
              {specificDates.map((date, idx) => (
                <View key={idx} style={styles.dateTag}>
                  <Text style={styles.dateTagText}>
                    {date.toLocaleDateString()}
                  </Text>
                  <TouchableOpacity onPress={() => removeSpecificDate(date)}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.doneButtonText}>Готово</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>📝 Заметки</Text>
        <TextInput
          placeholder="После еды..."
          placeholderTextColor="#6B7280"
          style={[styles.input, styles.notes]}
          multiline
        />

        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveText}>Сохранить</Text>
        </TouchableOpacity>
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={startDate ?? today}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChangeDate}
          minimumDate={today}
        />
      )}
    </View>
  );
}

function FrequencyButton({
  text,
  active,
  onPress,
}: {
  text: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.freqButton, active && styles.freqButtonActive]}
    >
      <Text
        style={[styles.freqButtonText, active && styles.freqButtonTextActive]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: { flexDirection: "row", alignItems: "center" },
  backText: { color: "#3B82F6", fontSize: 16, marginLeft: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
  form: { flex: 1 },
  label: {
    color: "white",
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#1F2937",
    color: "white",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  timeText: { color: "#3B82F6", fontSize: 16, fontWeight: "bold" },
  notes: { height: 100, textAlignVertical: "top" },
  saveButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },
  saveText: { color: "white", fontSize: 16, fontWeight: "bold" },
  frequencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  freqButton: {
    flex: 1,
    backgroundColor: "#1F2937",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  freqButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  freqButtonText: { color: "#9CA3AF", fontSize: 12 },
  freqButtonTextActive: { color: "white", fontWeight: "bold" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    marginTop: 5,
  },
  summaryText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  selectionBox: {
    backgroundColor: "#1F2937",
    padding: 15,
    borderRadius: 12,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#374151",
  },
  selectionTitle: {
    color: "white",
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.8,
  },
  dailyOptionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  dailyOptionBtn: {
    flex: 1,
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#374151",
    gap: 5,
  },
  dailyOptionText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "600",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  weekdayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  weekdayBtnActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  weekdayText: { color: "#9CA3AF", fontSize: 12 },
  weekdayTextActive: { color: "white", fontWeight: "bold" },
  addDateButton: {
    flexDirection: "row",
    backgroundColor: "#3B82F6",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 15,
  },
  datesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  dateTag: {
    flexDirection: "row",
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#374151",
  },
  dateTagText: {
    color: "white",
    fontSize: 13,
  },
  doneButton: {
    backgroundColor: "#111827",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  doneButtonText: {
    color: "#3B82F6",
    fontWeight: "bold",
  },
});
