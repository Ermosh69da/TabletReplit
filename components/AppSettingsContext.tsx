import React, { createContext, useContext, useMemo, useState } from "react";

export type AppSettings = {
  notificationsEnabled: boolean;

  quietHoursEnabled: boolean;
  quietFrom: string; // "HH:MM"
  quietTo: string; // "HH:MM"

  repeatEnabled: boolean;
  repeatMinutes: number; // e.g. 10
  repeatCount: number; // e.g. 3
};

type AppSettingsValue = {
  settings: AppSettings;

  setNotificationsEnabled: (v: boolean) => void;

  setQuietHoursEnabled: (v: boolean) => void;
  setQuietFrom: (v: string) => void;
  setQuietTo: (v: string) => void;

  setRepeatEnabled: (v: boolean) => void;
  setRepeatMinutes: (v: number) => void;
  setRepeatCount: (v: number) => void;
};

const Ctx = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AppSettings>({
    notificationsEnabled: true,

    quietHoursEnabled: false,
    quietFrom: "23:00",
    quietTo: "07:00",

    repeatEnabled: true,
    repeatMinutes: 10,
    repeatCount: 3,
  });

  const value = useMemo<AppSettingsValue>(() => {
    return {
      settings,

      setNotificationsEnabled: (v) =>
        setSettings((s) => ({ ...s, notificationsEnabled: v })),

      setQuietHoursEnabled: (v) =>
        setSettings((s) => ({ ...s, quietHoursEnabled: v })),
      setQuietFrom: (v) => setSettings((s) => ({ ...s, quietFrom: v })),
      setQuietTo: (v) => setSettings((s) => ({ ...s, quietTo: v })),

      setRepeatEnabled: (v) => setSettings((s) => ({ ...s, repeatEnabled: v })),
      setRepeatMinutes: (v) => setSettings((s) => ({ ...s, repeatMinutes: v })),
      setRepeatCount: (v) => setSettings((s) => ({ ...s, repeatCount: v })),
    };
  }, [settings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}
