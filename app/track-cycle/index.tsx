import { Header } from '@/components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Cycle, deleteCycle, getCycles } from '@/services/database';

export default function TrackCycleScreen() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

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
      style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor }]}
      onPress={() => router.push(`/track-cycle/${item.id}`)}
    >
      <View style={styles.cardContent}>
        <ThemedText type="label" style={{ color: mutedTextColor }}>Cycle</ThemedText>
        <ThemedText type="subtitle" style={styles.cycleName}>{item.name}</ThemedText>
        <ThemedText style={[styles.dateText, { color: mutedTextColor }]}>
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
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: withAlpha(textColor, 0.12) }]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText type="title" style={styles.emptyTitle}>No cycles found.</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>Start tracking.</ThemedText>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: textColor }]}
        onPress={() => router.push('/track-cycle/add')}
      >
        <MaterialCommunityIcons name="plus" size={24} color={backgroundColor} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 96,
  },
  card: {
    paddingVertical: 18,
    paddingHorizontal: 0,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 0,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cycleName: {
    fontSize: 24,
    lineHeight: 30,
  },
  dateText: {
    fontSize: 12,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  separator: {
    width: '100%',
    height: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    marginTop: 60,
    borderTopWidth: 1,
    width: '100%',
  },
  emptyTitle: {
    marginBottom: 8,
  },
});
