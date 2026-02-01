import React from "react";
import { View, Text, StyleSheet, Pressable, SectionList } from "react-native";
import { router } from "expo-router";

type Med = {
  id: string;
  title: string;
  dose: string;
  status: "active" | "paused";
  color: string;
};

const ACTIVE: Med[] = [
  { id: "1", title: "Плавикс", dose: "75 мг", status: "active", color: "#2563EB" },
  { id: "2", title: "Аспирин", dose: "100 мг", status: "active", color: "#EF4444" },
];

const PAUSED: Med[] = [
  { id: "3", title: "Витамин D3", dose: "2000 МЕ", status: "paused", color: "#F59E0B" },
];

export default function MyMedicationsScreen() {
  const sections = [
    { title: "АКТИВНЫЕ", data: ACTIVE },
    { title: "ПРИОСТАНОВЛЕННЫЕ", data: PAUSED },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мои лекарства</Text>

        <Pressable
          onPress={() => router.push("/medications/new")}
          style={styles.addButton}
          hitSlop={10}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <View style={[styles.leftIcon, { backgroundColor: item.color + "33" }]}>
              <Text style={[styles.leftIconPlus, { color: item.color }]}>+</Text>
            </View>

            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.dose}</Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B1220",
    paddingTop: 56,
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Кнопка "+" (квадратная с хорошими скруглениями)
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: -1,
  },

  listContent: {
    paddingBottom: 160, // чтобы список не залезал под таббар
  },

  sectionTitle: {
    marginTop: 10,
    marginBottom: 10,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  card: {
    height: 76,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 14,
  },

  leftIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  leftIconPlus: {
    fontSize: 22,
    fontWeight: "900",
  },

  cardText: { flex: 1 },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  cardSub: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },

  chevron: {
    color: "#64748B",
    fontSize: 26,
    marginLeft: 8,
    marginTop: -2,
  },
});