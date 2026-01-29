import { Tabs } from "expo-router";
import { Platform } from "react-native";

// SVG иконки
import HomeIcon from "../../assets/icons/home.svg";
import MedkitIcon from "../../assets/icons/medkit.svg";
import HistoryIcon from "../../assets/icons/history.svg";
import ProfileIcon from "../../assets/icons/profile.svg";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0F172A",
          borderTopColor: "#1E293B",
          height: 72,
        },
        tabBarActiveTintColor: "#38BDF8",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: Platform.OS === "ios" ? 0 : 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Домой",
          tabBarIcon: ({ color }) => (
            <HomeIcon width={24} height={24} fill={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="medications"
        options={{
          title: "Лекарства",
          tabBarIcon: ({ color }) => (
            <MedkitIcon width={24} height={24} fill={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "История",
          tabBarIcon: ({ color }) => (
            <HistoryIcon width={24} height={24} fill={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Профиль",
          tabBarIcon: ({ color }) => (
            <ProfileIcon width={24} height={24} fill={color} />
          ),
        }}
      />
    </Tabs>
  );
}
