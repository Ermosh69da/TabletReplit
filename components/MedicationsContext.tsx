import React, { createContext, useContext, useMemo, useState } from "react";

export type Period = "morning" | "day" | "evening";
export type TodayStatus = "pending" | "taken" | "skipped";

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  time: string; // "HH:MM"
  period: Period;
  notes: string;
  repeat: "daily";
};

type MedicationsContextValue = {
  medications: Medication[];
  addMedication: (data: Omit<Medication, "id">) => void;

  getTodayStatus: (medId: string) => TodayStatus;
  setTodayStatus: (medId: string, status: TodayStatus) => void;

  todayProgress: {
    totalDue: number;
    totalForProgress: number; // totalDue - skipped
    taken: number;
    skipped: number;
    percent: number;
  };
};

const MedicationsContext = createContext<MedicationsContextValue | null>(null);

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function MedicationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: "1",
      name: "Мелатонин",
      dosage: "3 мг",
      time: "22:00",
      period: "evening",
      notes: "",
      repeat: "daily",
    },
    {
      id: "2",
      name: "Плавикс",
      dosage: "75 мг",
      time: "21:00",
      period: "evening",
      notes: "",
      repeat: "daily",
    },
    {
      id: "3",
      name: "Аспирин",
      dosage: "100 мг",
      time: "09:00",
      period: "morning",
      notes: "",
      repeat: "daily",
    },
  ]);

  // dayStatus[dateKey][medId] = "taken" | "skipped"
  const [dayStatus, setDayStatus] = useState<
    Record<string, Record<string, "taken" | "skipped">>
  >({});

  const addMedication: MedicationsContextValue["addMedication"] = (data) => {
    setMedications((prev) => [{ id: String(Date.now()), ...data }, ...prev]);
  };

  const getTodayStatus: MedicationsContextValue["getTodayStatus"] = (medId) => {
    const key = todayKey();
    return dayStatus[key]?.[medId] ?? "pending";
  };

  const setTodayStatus: MedicationsContextValue["setTodayStatus"] = (
    medId,
    status,
  ) => {
    const key = todayKey();
    setDayStatus((prev) => {
      const cur = prev[key] ?? {};

      // pending = удалить запись из мапы
      if (status === "pending") {
        if (!cur[medId]) return prev;
        const { [medId]: _, ...rest } = cur;
        return { ...prev, [key]: rest };
      }

      // taken / skipped
      return { ...prev, [key]: { ...cur, [medId]: status } };
    });
  };

  const todayProgress = useMemo(() => {
    const todayMeds = medications.filter((m) => m.repeat === "daily");
    const totalDue = todayMeds.length;

    const taken = todayMeds.reduce(
      (acc, m) => acc + (getTodayStatus(m.id) === "taken" ? 1 : 0),
      0,
    );
    const skipped = todayMeds.reduce(
      (acc, m) => acc + (getTodayStatus(m.id) === "skipped" ? 1 : 0),
      0,
    );

    const totalForProgress = Math.max(0, totalDue - skipped);
    const percent =
      totalForProgress === 0 ? 0 : Math.round((taken / totalForProgress) * 100);

    return { totalDue, totalForProgress, taken, skipped, percent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications, dayStatus]);

  const value: MedicationsContextValue = {
    medications,
    addMedication,
    getTodayStatus,
    setTodayStatus,
    todayProgress,
  };

  return (
    <MedicationsContext.Provider value={value}>
      {children}
    </MedicationsContext.Provider>
  );
}

export function useMedications() {
  const ctx = useContext(MedicationsContext);
  if (!ctx)
    throw new Error("useMedications must be used within MedicationsProvider");
  return ctx;
}

export function periodLabel(p: Period) {
  if (p === "morning") return "утро";
  if (p === "day") return "день";
  return "вечер";
}
