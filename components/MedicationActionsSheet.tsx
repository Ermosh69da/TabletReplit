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

  paused?: boolean;
  onTogglePause: () => void;

  onEdit: () => void;
  onClose: () => void;

  onDelete?: () => void;
};

export default function MedicationActionsSheet({
  visible,
  title = "Лекарство",
  paused = false,
  onTogglePause,
  onEdit,
  onClose,
  onDelete,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* overlay */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* ВАЖНО ДЛЯ WEB: zIndex + pointerEvents чтобы overlay не перекрывал клики */}
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={styles.sheet} pointerEvents="auto">
          <Text style={styles.title}>{title}</Text>

          <TouchableOpacity
            style={styles.action}
            onPress={onEdit}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={20} color="#38BDF8" />
            <Text style={styles.actionText}>Редактировать</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.action}
            onPress={onTogglePause}
            activeOpacity={0.85}
          >
            <Ionicons
              name={paused ? "play-outline" : "pause-outline"}
              size={20}
              color="#FBBF24"
            />
            <Text style={styles.actionText}>
              {paused ? "Возобновить приём" : "Приостановить приём"}
            </Text>
          </TouchableOpacity>

          {onDelete ? (
            <TouchableOpacity
              style={[styles.action, styles.actionDelete]}
              onPress={onDelete}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[styles.actionText, styles.actionTextDelete]}>
                Удалить
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.action, styles.disabled]}>
              <Ionicons name="trash-outline" size={20} color="#64748B" />
              <Text style={styles.actionTextMuted}>Удалить (позже)</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancel}
            onPress={onClose}
            activeOpacity={0.85}
          >
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
    zIndex: 1,
  },
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    zIndex: 2,
  },
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

  actionDelete: {
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  actionTextDelete: {
    color: "#FCA5A5",
  },

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
