import { Tabs } from "expo-router";
import { Pressable, View, Text, StyleSheet, Platform } from "react-native";

import HomeIcon from "../../assets/icons/home.svg";
import MedkitIcon from "../../assets/icons/medkit.svg";
import HistoryIcon from "../../assets/icons/history.svg";
import ProfileIcon from "../../assets/icons/profile.svg";

function TileTabButton({ Icon, label, onPress, accessibilityState }: any) {
  const focused = !!accessibilityState?.selected;

  return (
    <Pressable onPress={onPress} style={styles.item}>
      <View style={[styles.tile, focused && styles.tileActive]}>
        <Icon width={26} height={26} fill={focused ? "#fff" : "#9CA3AF"} />
        <Text style={[styles.label, focused && styles.labelActive]}>
          {label}
        </Text>
      </View>
    </Pressable>
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
          tabBarButton: (props) => (
            <TileTabButton {...props} Icon={HomeIcon} label="Домой" />
          ),
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          tabBarButton: (props) => (
            <TileTabButton {...props} Icon={MedkitIcon} label="Лекарства" />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarButton: (props) => (
            <TileTabButton {...props} Icon={HistoryIcon} label="История" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarButton: (props) => (
            <TileTabButton {...props} Icon={ProfileIcon} label="Профиль" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    height: 100,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tile: {
    width: 86,
    height: 86,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#111827", // неактивная
  },
  tileActive: {
    backgroundColor: "#2563EB", // активная
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 24px rgba(59,130,246,0.65)" }
      : {
          shadowColor: "#3B82F6",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 16,
          elevation: 10,
        }),
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  labelActive: {
    color: "#fff",
    fontWeight: "700",
  },
});