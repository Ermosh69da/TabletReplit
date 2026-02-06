import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  type Period,
  useMedications,
} from "../../../components/MedicationsContext";

export default function NewMedicationScreen() {
  const router = useRouter();
  const { addMedication } = useMedications();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("21:35");
  const [period, setPeriod] = useState<Period>("evening");
  const [notes, setNotes] = useState("");

  const canSave = name.trim().length > 0;

  const onSave = () => {
    if (!canSave) return;

    addMedication({
      name: name.trim(),
      dosage: dosage.trim(),
      time: time.trim(),
      period,
      notes: notes.trim(),
      repeat: "daily",
    });

    // возвращаемся на вкладку "Лекарства"
    router.replace("/medications");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#3B82F6" />
          <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Новое лекарство</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>💊 Название</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Например: Аспирин"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />

        <Text style={styles.label}>⚖️ Дозировка</Text>
        <TextInput
          value={dosage}
          onChangeText={setDosage}
          placeholder="1 таблетка / 75 мг"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />

        <Text style={styles.label}>🕒 Время (HH:MM)</Text>
        <TextInput
          value={time}
          onChangeText={setTime}
          placeholder="21:35"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />

        <Text style={styles.label}>🌤 Период</Text>
        <View style={styles.periodRow}>
          {(["morning", "day", "evening"] as Period[]).map((p) => {
            const active = p === period;
            const text =
              p === "morning" ? "утро" : p === "day" ? "день" : "вечер";
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.periodBtn, active && styles.periodBtnActive]}
              >
                <Text
                  style={[styles.periodText, active && styles.periodTextActive]}
                >
                  {text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>📝 Заметки</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="После еды..."
          placeholderTextColor="#6B7280"
          style={[styles.input, styles.notes]}
          multiline
        />
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={onSave}
        disabled={!canSave}
        activeOpacity={0.85}
      >
        <Text style={styles.saveText}>Сохранить</Text>
      </TouchableOpacity>
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

  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  backButton: { flexDirection: "row", alignItems: "center", width: 60 },
  backText: { color: "#3B82F6", fontSize: 16, marginLeft: 4 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  form: { flex: 1 },

  label: { color: "#9CA3AF", marginTop: 16, marginBottom: 6, fontSize: 14 },

  input: {
    backgroundColor: "#0E1629",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 16,
  },

  periodRow: { flexDirection: "row", gap: 10 },
  periodBtn: {
    flex: 1,
    backgroundColor: "#0E1629",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  periodBtnActive: { backgroundColor: "#1D4ED8" },
  periodText: { color: "#94A3B8", fontWeight: "700" },
  periodTextActive: { color: "#E5E7EB" },

  notes: { height: 100, textAlignVertical: "top" },

  saveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
});
