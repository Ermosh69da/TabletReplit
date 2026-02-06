import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TodayStatus } from "./MedicationsContext";

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  currentStatus?: TodayStatus;
  onSelect: (status: TodayStatus) => void;
  onClose: () => void;
};

export default function TodayStatusSheet({
  visible,
  title = "Приём",
  subtitle,
  currentStatus,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          <TouchableOpacity
            style={[
              styles.action,
              currentStatus === "taken" && styles.actionActive,
            ]}
            onPress={() => onSelect("taken")}
          >
            <Ionicons name="checkmark-circle" size={20} color="#38BDF8" />
            <Text style={styles.actionText}>Отметить как “Принято”</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.action,
              currentStatus === "skipped" && styles.actionActive,
            ]}
            onPress={() => onSelect("skipped")}
          >
            <Ionicons name="close-circle" size={20} color="#A3A3A3" />
            <Text style={styles.actionText}>Пропустить</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.action}
            onPress={() => onSelect("pending")}
          >
            <Ionicons name="refresh" size={20} color="#94A3B8" />
            <Text style={styles.actionText}>
              Сбросить (вернуть “не отмечено”)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    backgroundColor: "#0E1629",
    borderRadius: 16,
    padding: 14,
  },
  title: { color: "#E5E7EB", fontSize: 16, fontWeight: "800" },
  subtitle: { color: "#94A3B8", marginTop: 6, marginBottom: 6 },

  action: {
    marginTop: 10,
    backgroundColor: "#0B1220",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionActive: {
    borderWidth: 1,
    borderColor: "#1D4ED8",
  },
  actionText: { color: "#E5E7EB", fontWeight: "700" },

  cancel: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  cancelText: { color: "#E5E7EB", fontWeight: "800" },
});
