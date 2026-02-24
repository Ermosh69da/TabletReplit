import notifee, { EventType } from "@notifee/react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { setReminderPayload } from "./ReminderStore";

const UI_KIND = "MED_REMINDER";

export default function NotifeeBootstrap() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const go = (data: any) => {
      if (!data || data.kind !== UI_KIND) return;
      setReminderPayload(data);
      // replace чтобы не плодить историю
      router.replace("/reminder");
    };

    (async () => {
      const init = await notifee.getInitialNotification();
      const data: any = init?.notification?.data ?? null;
      if (mounted && data?.kind === UI_KIND) go(data);
    })();

    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      const data: any = detail.notification?.data ?? null;
      if (!data || data.kind !== UI_KIND) return;

      // при delivered/press/action — открываем экран карточки
      if (
        type === EventType.DELIVERED ||
        type === EventType.PRESS ||
        type === EventType.ACTION_PRESS
      ) {
        go(data);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [router]);

  return null;
}
