import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import notifee from "@notifee/react-native";

import { consumeReminderPayload } from "../components/ReminderStore";
import { useMedications } from "../components/MedicationsContext";

export default function ReminderScreen() {
  const router = useRouter();
  const { setStatusForDate }: any = useMedications();

  const payload = useMemo(() => consumeReminderPayload(), []);
  const doses: any[] = Array.isArray(payload?.doses) ? payload.doses : [];

  const displayTime = String(payload?.displayTime ?? payload?.time ?? "—");
  const dateKey = String(payload?.dateKey ?? "");
  const groupKey = String(payload?.groupKey ?? "");
  const logicalTime = String(payload?.time ?? "");

  const close = () => router.replace("/");

  const cancelByGroupKey = async () => {
    const list = await notifee.getTriggerNotifications();
    const ids = list
      .filter(
        (x) =>
          String((x.notification?.data as any)?.groupKey ?? "") === groupKey,
      )
      .map((x) => x.notification.id)
      .filter(Boolean);
    await Promise.all(ids.map((id) => notifee.cancelTriggerNotification(id)));
  };

  const takeAll = async () => {
    for (const d of doses) {
      setStatusForDate(
        dateKey,
        String(d.medId),
        "taken",
        String(d.time ?? logicalTime),
      );
    }
    await cancelByGroupKey();
    close();
  };

  const skipAll = async () => {
    for (const d of doses) {
      setStatusForDate(
        dateKey,
        String(d.medId),
        "skipped",
        String(d.time ?? logicalTime),
      );
    }
    await cancelByGroupKey();
    close();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {doses.length} новых задания для {displayTime}
        </Text>

        <ScrollView style={styles.list} contentContainerStyle={{ padding: 12 }}>
          {doses.map((d, idx) => (
            <View key={`${d.medId}@${idx}`} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{String(d.name ?? "Лекарство")}</Text>
                <Text style={styles.sub}>{String(d.dosage ?? "—")}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnRed]}
            onPress={skipAll}
          >
            <Text style={styles.btnText}>Пропустить все</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnGreen]}
            onPress={takeAll}
          >
            <Text style={[styles.btnText, { color: "#052012" }]}>
              Подтвердить все
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.close} onPress={close}>
          <Text style={styles.closeText}>Закрыть</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#0F172A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#22304A",
    padding: 16,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  list: {
    maxHeight: 260,
    backgroundColor: "#111C33",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#22304A",
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  name: { color: "#F8FAFC", fontWeight: "900" },
  sub: { color: "#94A3B8", marginTop: 2, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 18, alignItems: "center" },
  btnRed: { backgroundColor: "#EF4444" },
  btnGreen: { backgroundColor: "#22C55E" },
  btnText: { color: "#F8FAFC", fontWeight: "900" },
  close: { marginTop: 12, alignItems: "center", paddingVertical: 10 },
  closeText: { color: "#94A3B8", fontWeight: "900" },
});
