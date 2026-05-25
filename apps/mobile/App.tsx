import { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";

import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { HabitsScreen } from "./src/screens/HabitsScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { FinanceScreen } from "./src/screens/FinanceScreen";
import { NotesScreen } from "./src/screens/NotesScreen";
import { KnowledgeScreen } from "./src/screens/KnowledgeScreen";
import { CareerScreen } from "./src/screens/CareerScreen";
import { colors } from "./src/theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

const TAB_ICONS: Record<string, string> = {
  Dashboard: "◉",
  Tasks: "✓",
  Habits: "★",
  Finance: "₹",
  Chat: "⬡",
  Notes: "✎",
  Knowledge: "⬡",
  Career: "⚡",
};

function MainTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.card, shadowColor: "transparent", elevation: 0 },
        headerTitleStyle: { color: colors.text, fontWeight: "600" },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 16 }}>{TAB_ICONS[route.name] ?? "·"}</Text>
        ),
        tabBarLabelStyle: { fontSize: 10 },
      })}
    >
      <Tab.Screen name="Dashboard">
        {() => <DashboardScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Finance" component={FinanceScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Knowledge" component={KnowledgeScreen} />
      <Tab.Screen name="Career" component={CareerScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync("access_token").then((t) => setAuthed(!!t));
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLogin={() => setAuthed(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={NAV_THEME}>
        <MainTabs onLogout={() => setAuthed(false)} />
      </NavigationContainer>
    </>
  );
}
