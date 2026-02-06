import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
  periodLabel,
  useMedications,
} from "../../../components/MedicationsContext";

export default function MedicationsScreen() {
  const { medications } = useMedications();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Мои лекарства</Text>

          <Link href="/medications/new" asChild>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={24} color="#0B1220" />
            </TouchableOpacity>
          </Link>
        </View>

        {/* LIST */}
        {medications.map((m) => (
          <View key={m.id} style={styles.card}>
            <Text style={styles.medName}>{m.name}</Text>
            <Text style={styles.medInfo}>
              {m.dosage || "—"} • {m.time} • {periodLabel(m.period)}
            </Text>
          </View>
        ))}
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
  title: { color: "#E5E7EB", fontSize: 20, fontWeight: "800" },
  addButton: { backgroundColor: "#38BDF8", borderRadius: 12, padding: 10 },

  card: {
    backgroundColor: "#0E1629",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  medName: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  medInfo: { color: "#94A3B8", fontSize: 13 },
});
