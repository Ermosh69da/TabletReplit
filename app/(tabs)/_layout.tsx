import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import React, { useEffect, useState } from "react";

import HomeIcon from "../../assets/icons/home.svg";
import MedkitIcon from "../../assets/icons/medkit.svg";
import HistoryIcon from "../../assets/icons/history.svg";
import ProfileIcon from "../../assets/icons/profile.svg";

function useWebKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const vv = (globalThis as any)?.visualViewport;
    if (!vv) return;

    let baseHeight = vv.height;

    const update = () => {
      baseHeight = Math.max(baseHeight, vv.height);
      const diff = baseHeight - vv.height;
      setOpen(diff > 80);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return open;
}

function TabButton({
  focused,
  Icon,
  label,
}: {
  focused: boolean;
  Icon: any;
  label: string;
}) {
  return (
    <View
      style={[styles.tile, focused ? styles.tileActive : styles.tileInactive]}
    >
      <Icon width={24} height={24} fill={focused ? "#FFFFFF" : "#9CA3AF"} />
      <Text
        style={[
          styles.label,
          focused ? styles.labelActive : styles.labelInactive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const webKeyboardOpen = useWebKeyboardOpen();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        // iOS/Android: прячем таббар при открытой клавиатуре
        tabBarHideOnKeyboard: true,

        // Web: тоже прячем, чтобы не "всплывал" над клавиатурой
        tabBarStyle: [
          styles.tabBar,
          Platform.OS === "web" && webKeyboardOpen ? { display: "none" } : null,
        ],

        tabBarItemStyle: { height: 100, padding: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused} Icon={HomeIcon} label="Домой" />
          ),
        }}
      />

      <Tabs.Screen
        name="medications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused} Icon={MedkitIcon} label="Лекарства" />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused} Icon={HistoryIcon} label="История" />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused} Icon={ProfileIcon} label="Профиль" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "#0F172A",
    borderTopWidth: 0,
    paddingTop: 40,
  },

  tile: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  tileInactive: { backgroundColor: "#1E293B" },

  tileActive: {
    backgroundColor: "#3B82F6",
    ...Platform.select({
      web: { boxShadow: "0px 0px 15px rgba(59, 130, 246, 0.6)" } as any,
      default: {
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },

  label: { fontSize: 10, fontWeight: "600" },
  labelInactive: { color: "#94A3B8" },
  labelActive: { color: "#FFFFFF", fontWeight: "bold" },
});
