import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MedicationsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <Text style={styles.title}>Мои лекарства</Text>

          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={28} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* ===== LIST ===== */}
        <View style={styles.card}>
          <Text style={styles.medName}>Плавикс</Text>
          <Text style={styles.medInfo}>75 мг • ежедневно</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.medName}>Аспирин</Text>
          <Text style={styles.medInfo}>100 мг • утром</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    color: "#E5E7EB",
    fontSize: 22,
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 14,
    padding: 10,
  },

  /* Cards */
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  medName: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  medInfo: {
    color: "#94A3B8",
    fontSize: 13,
  },
});
