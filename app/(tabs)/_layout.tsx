import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

import HomeIcon from "../../assets/icons/home.svg";
import MedkitIcon from "../../assets/icons/medkit.svg";
import HistoryIcon from "../../assets/icons/history.svg";
import ProfileIcon from "../../assets/icons/profile.svg";

function TabButton({ focused, Icon, label }: any) {
  return (
    <View style={[styles.tabButton, focused && styles.active]}>
      <Icon
        width={22}
        height={22}
        fill={focused ? "#ffffff" : "#94a3b8"}
      />
      <Text style={[styles.label, focused && styles.labelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused} Icon={HomeIcon} label="Дом" />
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
    height: 78,
    backgroundColor: "#0f172a",
    borderTopWidth: 0,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabButton: {
    width: 72,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  active: {
    backgroundColor: "#4a6cf7",
  },
  label: {
    fontSize: 11,
    color: "#94a3b8",
  },
  labelActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
