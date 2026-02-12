import React, { createContext, useContext, useMemo, useState } from "react";

export type Period = "morning" | "day" | "evening";
export type TodayStatus = "pending" | "taken" | "skipped";
export type RepeatMode = "daily" | "weekdays" | "dates";

export type Medication = {
  id: string;
  name: string;
  dosage: string;

  time: string; // "HH:MM" (первое время, для совместимости)
  times?: string[]; // ["HH:MM", ...]

  period: Period; // fallback период (по первому времени)
  notes: string;

  repeat: RepeatMode;
  startDate?: string; // YYYY-MM-DD
  weekdays?: number[]; // 0..6
  dates?: string[]; // YYYY-MM-DD[]
};

type MedicationsContextValue = {
  medications: Medication[];
  addMedication: (data: Omit<Medication, "id">) => void;

  getMedicationById: (id: string) => Medication | undefined;
  updateMedication: (id: string, data: Omit<Medication, "id">) => void;

  isDueToday: (med: Medication) => boolean;

  getTodayStatus: (medId: string, time?: string) => TodayStatus;
  setTodayStatus: (medId: string, status: TodayStatus, time?: string) => void;

  todayProgress: {
    totalDue: number;
    totalForProgress: number;
    taken: number;
    skipped: number;
    percent: number;
  };
};

const MedicationsContext = createContext<MedicationsContextValue | null>(null);

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

function isDueOnDate(med: Medication, key: string) {
  if (med.startDate && key < med.startDate) return false;

  if (med.repeat === "daily") return true;

  if (med.repeat === "weekdays") {
    const dow = dateFromKey(key).getDay();
    const days =
      med.weekdays && med.weekdays.length > 0
        ? med.weekdays
        : [0, 1, 2, 3, 4, 5, 6];
    return days.includes(dow);
  }

  const list = med.dates ?? [];
  return list.includes(key);
}

function normalizeTime(t: string) {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
}

function extractTimes(med: Medication): string[] {
  if (Array.isArray(med.times) && med.times.length > 0) {
    return Array.from(
      new Set(
        med.times.map((t) => normalizeTime(String(t).trim())).filter(Boolean),
      ),
    ).sort();
  }

  const raw = typeof med.time === "string" ? med.time : "";
  const matches = raw.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
  const normalized = matches.map(normalizeTime).filter(Boolean);
  if (normalized.length > 0) return Array.from(new Set(normalized)).sort();

  if (raw.trim()) return [normalizeTime(raw.trim())];
  return [];
}

function doseKey(medId: string, time?: string) {
  return time ? `${medId}@${time}` : medId;
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
      times: ["22:00"],
      period: "evening",
      notes: "",
      repeat: "daily",
      startDate: dateKey(),
    },
    {
      id: "2",
      name: "Плавикс",
      dosage: "75 мг",
      time: "21:00",
      times: ["21:00"],
      period: "evening",
      notes: "",
      repeat: "daily",
      startDate: dateKey(),
    },
    {
      id: "3",
      name: "Аспирин",
      dosage: "100 мг",
      time: "09:00",
      times: ["09:00"],
      period: "morning",
      notes: "",
      repeat: "daily",
      startDate: dateKey(),
    },
  ]);

  // dayStatus[dateKey][doseKey] = "taken" | "skipped"
  const [dayStatus, setDayStatus] = useState<
    Record<string, Record<string, "taken" | "skipped">>
  >({});

  const addMedication: MedicationsContextValue["addMedication"] = (data) => {
    const times = extractTimes(data as Medication);

    const normalized: Omit<Medication, "id"> = {
      ...data,
      time: times[0] ?? data.time ?? "",
      times: times.length ? times : data.times,

      repeat: data.repeat ?? "daily",
      startDate: data.startDate ?? dateKey(),
      weekdays:
        data.repeat === "weekdays"
          ? data.weekdays && data.weekdays.length > 0
            ? data.weekdays
            : [0, 1, 2, 3, 4, 5, 6]
          : data.weekdays,
      dates:
        data.repeat === "dates"
          ? data.dates && data.dates.length > 0
            ? data.dates
            : [dateKey()]
          : data.dates,
    };

    setMedications((prev) => [
      { id: String(Date.now()), ...normalized },
      ...prev,
    ]);
  };

  const getMedicationById: MedicationsContextValue["getMedicationById"] = (
    id,
  ) => {
    return medications.find((m) => m.id === id);
  };

  const updateMedication: MedicationsContextValue["updateMedication"] = (
    id,
    data,
  ) => {
    const times = extractTimes(data as Medication);

    const normalized: Omit<Medication, "id"> = {
      ...data,
      time: times[0] ?? data.time ?? "",
      times: times.length ? times : data.times,
    };

    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { id, ...normalized } : m)),
    );
  };

  const isDueToday: MedicationsContextValue["isDueToday"] = (med) => {
    return isDueOnDate(med, dateKey());
  };

  const getTodayStatus: MedicationsContextValue["getTodayStatus"] = (
    medId,
    time,
  ) => {
    const key = dateKey();
    const map = dayStatus[key] ?? {};
    const dk = doseKey(medId, time);

    if (map[dk]) return map[dk];
    if (time && map[medId]) return map[medId]; // fallback для старых записей
    return "pending";
  };

  const setTodayStatus: MedicationsContextValue["setTodayStatus"] = (
    medId,
    status,
    time,
  ) => {
    const key = dateKey();
    const dk = doseKey(medId, time);

    setDayStatus((prev) => {
      const cur = prev[key] ?? {};

      if (status === "pending") {
        if (!cur[dk]) return prev;
        const { [dk]: _, ...rest } = cur;
        return { ...prev, [key]: rest };
      }

      return { ...prev, [key]: { ...cur, [dk]: status } };
    });
  };

  const todayProgress = useMemo(() => {
    const today = dateKey();
    const dueMeds = medications.filter((m) => isDueOnDate(m, today));

    const dueDoses = dueMeds.flatMap((m) => {
      const times = extractTimes(m);
      return times.length
        ? times.map((t) => ({ medId: m.id, time: t }))
        : [{ medId: m.id, time: undefined as any }];
    });

    const totalDue = dueDoses.length;

    const taken = dueDoses.reduce(
      (acc, d) => acc + (getTodayStatus(d.medId, d.time) === "taken" ? 1 : 0),
      0,
    );
    const skipped = dueDoses.reduce(
      (acc, d) => acc + (getTodayStatus(d.medId, d.time) === "skipped" ? 1 : 0),
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
    getMedicationById,
    updateMedication,
    isDueToday,
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
