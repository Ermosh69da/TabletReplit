import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// Типы
type Period = "morning" | "afternoon" | "evening";
type MedicationStatus = "pending" | "taken" | "skipped";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  status: MedicationStatus;
}

// Начальные данные
const INITIAL_DATA: Medication[] = [
  {
    id: "1",
    name: "Аспирин",
    dosage: "100 мг",
    time: "08:00",
    status: "taken",
  },
  {
    id: "2",
    name: "Витамин D",
    dosage: "1 капсула",
    time: "09:30",
    status: "pending",
  },
  {
    id: "3",
    name: "Омега-3",
    dosage: "1 капсула",
    time: "14:00",
    status: "pending",
  },
  {
    id: "4",
    name: "Магний B6",
    dosage: "1 таблетка",
    time: "14:30",
    status: "pending",
  },
  {
    id: "5",
    name: "Мелатонин",
    dosage: "3 мг",
    time: "22:00",
    status: "pending",
  },
  {
    id: "6",
    name: "Плавикс",
    dosage: "75 мг",
    time: "21:00",
    status: "pending",
  },
];

export default function HomeScreen() {
  const router = useRouter();

  const [medications, setMedications] = useState<Medication[]>(INITIAL_DATA);
  const [activePeriod, setActivePeriod] = useState<Period>("morning");

  // --- ЛОГИКА ---

  const handlePress = (id: string) => {
    setMedications((prevMeds) =>
      prevMeds.map((med) => {
        if (med.id !== id) return med;
        return { ...med, status: med.status === "taken" ? "pending" : "taken" };
      }),
    );
  };

  const handleLongPress = (id: string) => {
    setMedications((prevMeds) =>
      prevMeds.map((med) => {
        if (med.id !== id) return med;
        return {
          ...med,
          status: med.status === "skipped" ? "pending" : "skipped",
        };
      }),
    );
  };

  const getPeriodFromTime = (time: string): Period => {
    const hour = parseInt(time.split(":")[0], 10);
    if (hour >= 4 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    return "evening";
  };

  const totalDaily = medications.length;
  const takenDaily = medications.filter((m) => m.status === "taken").length;
  const progressPercent =
    totalDaily > 0 ? Math.round((takenDaily / totalDaily) * 100) : 0;

  const filteredMedications = medications.filter(
    (med) => getPeriodFromTime(med.time) === activePeriod,
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Прими пилюльку !!!</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/(tabs)/medications/new")}
          >
            <MaterialCommunityIcons name="plus" size={26} color="white" />
          </TouchableOpacity>
        </View>

        {/* --- КАРТОЧКА ПРОГРЕССА --- */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <View>
                <Text style={styles.progressLabel}>ПРОГРЕСС СЕГОДНЯ</Text>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
              <Text style={styles.progressCount}>
                {takenDaily} <Text style={{ color: "#6B7280" }}>из</Text>{" "}
                {totalDaily}
              </Text>
            </View>

            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* --- ВКЛАДКИ --- */}
        <View style={styles.tabsContainer}>
          <FilterButton
            title="УТРО"
            icon="weather-sunny"
            isActive={activePeriod === "morning"}
            onPress={() => setActivePeriod("morning")}
          />
          <FilterButton
            title="ДЕНЬ"
            icon="weather-partly-cloudy"
            isActive={activePeriod === "afternoon"}
            onPress={() => setActivePeriod("afternoon")}
          />
          <FilterButton
            title="ВЕЧЕР"
            icon="weather-night"
            isActive={activePeriod === "evening"}
            onPress={() => setActivePeriod("evening")}
          />
        </View>

        <Text style={styles.sectionTitle}>План приёма</Text>
        <Text style={styles.hintText}>💡 Удерживайте, чтобы пропустить</Text>

        {/* --- СПИСОК ЛЕКАРСТВ --- */}
        <View style={styles.listContainer}>
          {filteredMedications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                На это время приемов нет 😴
              </Text>
            </View>
          ) : (
            filteredMedications.map((med) => (
              <TouchableOpacity
                key={med.id}
                style={[
                  styles.medCard,
                  med.status === "skipped" && styles.medCardSkipped,
                ]}
                activeOpacity={0.7}
                onPress={() => handlePress(med.id)}
                onLongPress={() => handleLongPress(med.id)}
                delayLongPress={500}
              >
                <View style={styles.medInfo}>
                  <Text
                    style={[
                      styles.medName,
                      med.status === "taken" && styles.medNameTaken,
                      med.status === "skipped" && styles.medNameSkipped,
                    ]}
                  >
                    {med.name}
                  </Text>

                  <View style={styles.medDetailsRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={14}
                      color="#9CA3AF"
                    />
                    <Text style={styles.medTime}>{med.time}</Text>
                    <Text style={styles.medDosage}>• {med.dosage}</Text>

                    {/* ЛОГИКА ОТОБРАЖЕНИЯ СТАТУСОВ */}
                    {med.status === "skipped" && (
                      <Text style={styles.skippedLabel}>• Пропущено</Text>
                    )}
                    {med.status === "taken" && (
                      <Text style={styles.takenLabel}>• Принято</Text>
                    )}
                  </View>
                </View>

                {/* Чекбокс с 3 состояниями */}
                <View
                  style={[
                    styles.checkbox,
                    med.status === "taken" && styles.checkboxTaken,
                    med.status === "skipped" && styles.checkboxSkipped,
                  ]}
                >
                  {med.status === "taken" && (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color="white"
                    />
                  )}
                  {med.status === "skipped" && (
                    <MaterialCommunityIcons
                      name="close"
                      size={18}
                      color="white"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterButton({
  title,
  icon,
  isActive,
  onPress,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={isActive ? "#3B82F6" : "#9CA3AF"}
        style={{ marginBottom: 4 }}
      />
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    paddingTop: Platform.OS === "android" ? 30 : 0,
  },
  header: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  dateText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 4,
    textTransform: "capitalize",
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  progressCard: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 15,
  },
  progressLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  progressPercent: {
    color: "white",
    fontSize: 42,
    fontWeight: "bold",
    lineHeight: 42,
  },
  progressCount: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#374151",
    borderRadius: 4,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    backgroundColor: "#1F2937",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  tabButtonActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#3B82F6",
  },
  tabText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  tabTextActive: {
    color: "#3B82F6",
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 20,
  },
  hintText: {
    color: "#6B7280",
    fontSize: 12,
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#6B7280",
    fontStyle: "italic",
  },
  medCard: {
    backgroundColor: "#1F2937",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medCardSkipped: {
    opacity: 0.6,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  medNameTaken: {
    textDecorationLine: "line-through",
    color: "#6B7280",
  },
  medNameSkipped: {
    color: "#F59E0B",
  },
  medDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  medTime: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  medDosage: {
    color: "#6B7280",
    fontSize: 14,
  },
  // НОВЫЕ СТИЛИ ДЛЯ ТЕКСТА
  skippedLabel: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "bold",
  },
  takenLabel: {
    color: "#3B82F6", // Синий цвет как у галочки
    fontSize: 12,
    fontWeight: "bold",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  checkboxTaken: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkboxSkipped: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
});
