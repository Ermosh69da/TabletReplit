import { View, Text, StyleSheet } from 'react-native';

export default function MedicationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Лекарства</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  text: { color: '#fff', fontSize: 24 },
});
