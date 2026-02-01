import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Прими пилюльку!!!</Text>
            <Text style={styles.subtitle}>Ваш помощник</Text>
          </View>

          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="add" size={28} color="#E5E7EB" />
          </TouchableOpacity>
        </View>

        {/* ===== PROGRESS ===== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ПРОГРЕСС СЕГОДНЯ</Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressPercent}>0%</Text>
            <Text style={styles.progressText}>0 из 1</Text>
          </View>
        </View>

        {/* ===== FILTERS ===== */}
        <View style={styles.filters}>
          <FilterButton icon="sunny-outline" label="УТРО" active />
          <FilterButton icon="partly-sunny-outline" label="ДЕНЬ" />
          <FilterButton icon="moon-outline" label="ВЕЧЕР" />
        </View>

        {/* ===== PLAN ===== */}
        <Text style={styles.sectionTitle}>План приёма</Text>

        <View style={styles.card}>
          <View style={styles.medRow}>
            <View>
              <Text style={styles.medName}>Плавикс</Text>
              <View style={styles.medTimeRow}>
                <Ionicons name="time-outline" size={14} color="#94A3B8" />
                <Text style={styles.medTime}>09:00</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.checkbox}>
              <Ionicons name="checkmark" size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

/* ===== FILTER BUTTON ===== */
function FilterButton({ icon, label, active = false }: any) {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? '#0F172A' : '#E5E7EB'}
      />
      <Text
        style={[styles.filterText, active && styles.filterTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#E5E7EB',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    marginTop: 4,
  },
  iconButton: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 10,
  },

  /* Cards */
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
    letterSpacing: 1,
  },

  /* Progress */
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  progressPercent: {
    color: '#38BDF8',
    fontSize: 36,
    fontWeight: '700',
  },
  progressText: {
    color: '#94A3B8',
  },

  /* Filters */
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#38BDF8',
  },
  filterText: {
    color: '#E5E7EB',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#0F172A',
    fontWeight: '600',
  },

  /* Plan */
  sectionTitle: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medName: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '600',
  },
  medTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  medTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
