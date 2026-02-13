import { Header } from '@/components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Cycle, deleteCycle, getCycles } from '@/services/database';

export default function TrackCycleScreen() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const router = useRouter();
  const primaryColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'card');

  const loadCycles = async () => {
    const data = await getCycles();
    setCycles(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadCycles();
    }, [])
  );

  const handleDelete = async (id: number) => {
    await deleteCycle(id);
    loadCycles();
  };

  const renderItem = ({ item }: { item: Cycle }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBackgroundColor }]}
      onPress={() => router.push(`/track-cycle/${item.id}`)}
    >
      <View style={styles.cardContent}>
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <ThemedText style={styles.dateText}>
          {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
        </ThemedText>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={10}>
        <MaterialCommunityIcons name="delete-outline" size={24} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <Header title="Cycles" />

      <FlatList
        data={cycles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText>No cycles found. Start tracking!</ThemedText>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={() => router.push('/track-cycle/add')}
      >
        <MaterialCommunityIcons name="plus" size={24} color="white" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
