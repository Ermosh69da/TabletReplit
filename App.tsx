import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import AppWrapper from './src/components/AppWrapper';

export default function App() {
  return (
    <AppWrapper>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </AppWrapper>
  );
}
