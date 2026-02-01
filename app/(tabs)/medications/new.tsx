import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function NewMedicationScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
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

        <Text style={styles.label}>📝 Заметки</Text>
        <TextInput
          placeholder="После еды..."
          placeholderTextColor="#6B7280"
          style={[styles.input, styles.notes]}
          multiline
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        activeOpacity={0.85}
        onPress={() => {
          console.log("Кнопка Сохранить нажата");
        }}
      >
        <Text style={styles.saveText}>Сохранить</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050B18",
  },

  content: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    width: 60,
  },

  backText: {
    color: "#3B82F6",
    fontSize: 16,
    marginLeft: 4,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  form: {
    marginBottom: 24,
  },

  label: {
    color: "#9CA3AF",
    marginTop: 16,
    marginBottom: 6,
    fontSize: 14,
  },

  input: {
    backgroundColor: "#0E1629",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 16,
  },

  timeText: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  notes: {
    height: 100,
    textAlignVertical: "top",
  },

  saveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
