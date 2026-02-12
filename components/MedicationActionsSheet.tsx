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

type Props = {
  visible: boolean;
  title?: string;
  onEdit: () => void;
  onClose: () => void;

  // заглушки на будущее
  onDelete?: () => void;
  onPause?: () => void;
};

export default function MedicationActionsSheet({
  visible,
  title = "Лекарство",
  onEdit,
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

      <View style={styles.wrap}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>

          <TouchableOpacity style={styles.action} onPress={onEdit}>
            <Ionicons name="create-outline" size={20} color="#38BDF8" />
            <Text style={styles.actionText}>Редактировать</Text>
          </TouchableOpacity>

          {/* заглушки */}
          <View style={[styles.action, styles.disabled]}>
            <Ionicons name="pause-outline" size={20} color="#64748B" />
            <Text style={styles.actionTextMuted}>Приостановить (позже)</Text>
          </View>

          <View style={[styles.action, styles.disabled]}>
            <Ionicons name="trash-outline" size={20} color="#64748B" />
            <Text style={styles.actionTextMuted}>Удалить (позже)</Text>
          </View>

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
  wrap: { flex: 1, justifyContent: "flex-end", padding: 16 },
  sheet: {
    backgroundColor: "#0E1629",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  title: { color: "#E5E7EB", fontSize: 16, fontWeight: "900" },

  action: {
    marginTop: 10,
    backgroundColor: "#0B1220",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  actionText: { color: "#E5E7EB", fontWeight: "800" },
  actionTextMuted: { color: "#94A3B8", fontWeight: "800" },
  disabled: { opacity: 0.6 },

  cancel: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  cancelText: { color: "#E5E7EB", fontWeight: "900" },
});
