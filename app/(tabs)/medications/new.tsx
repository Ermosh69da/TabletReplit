import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { router } from "expo-router";

export default function NewMedicationScreen() {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹</Text>
        </Pressable>

        <Text style={styles.title}>Новое лекарство</Text>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Название</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Например: Аспирин"
          placeholderTextColor="#64748B"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Дозировка</Text>
        <TextInput
          value={dose}
          onChangeText={setDose}
          placeholder="Например: 100 мг"
          placeholderTextColor="#64748B"
          style={styles.input}
        />

        <Pressable onPress={() => router.back()} style={styles.saveBtn}>
          <Text style={styles.saveText}>Сохранить</Text>
        </Pressable>
      </View>
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
    marginBottom: 20,
  },

  back: { color: "#FFFFFF", fontSize: 34, width: 24 },

  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },

  form: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 14,
  },

  label: { color: "#94A3B8", fontSize: 12, fontWeight: "800", marginBottom: 8 },

  input: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    color: "#FFFFFF",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },

  saveBtn: {
    marginTop: 18,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});