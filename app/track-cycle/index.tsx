import { Header } from '@/components/Header';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { formatDateRange, getCycleProgress } from '@/components/cycle/cycle-progress';
import { CycleProgressBar, CycleStatusChip } from '@/components/cycle/cycle-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import { useTheme } from '@/hooks/use-theme';
import { Cycle, deleteCycle, getCycles } from '@/services/database';

export default function TrackCycleScreen() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const router = useRouter();
  const { colors, accents } = useTheme();
  const accent = accents.cycle;

  const loadCycles = useCallback(async () => {
    const data = await getCycles();
    setCycles(data);
  }, []);

  useSyncRefresh(loadCycles);

  const handleDelete = (cycle: Cycle) => {
    Alert.alert('Delete cycle', `Delete "${cycle.name}" and all of its compounds?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCycle(cycle.id);
            loadCycles();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete cycle: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Cycle }) => (
    <Card style={styles.card} onPress={() => router.push(`/track-cycle/${item.id}`)} accessibilityLabel={item.name}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <ThemedText type="heading" numberOfLines={1}>{item.name}</ThemedText>
          <ThemedText type="caption" tone="muted">
            {formatDateRange(item.start_date, item.end_date)}
          </ThemedText>
        </View>
        <CycleStatusChip status={getCycleProgress(item.start_date, item.end_date).status} accent={accent} />
        <IconButton
          icon="trash-can-outline"
          color={colors.danger}
          size={36}
          onPress={() => handleDelete(item)}
          accessibilityLabel={`Delete ${item.name}`}
        />
      </View>
      <CycleProgressBar startDate={item.start_date} endDate={item.end_date} accent={accent} />
    </Card>
  );

  return (
    <ThemedView style={styles.container}>
      <Header eyebrow="Cycle" accent={accent} title="Cycles" />

      <FlatList
        data={cycles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="needle"
            accent={accent}
            title="No cycles yet"
            message="Plan a cycle, add compounds and see estimated levels over time."
            action={<Button label="New cycle" icon="plus" color={accent} onPress={() => router.push('/track-cycle/add')} />}
          />
        }
      />

      {cycles.length > 0 && <Fab label="New cycle" color={accent} onPress={() => router.push('/track-cycle/add')} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    gap: 16,
    paddingRight: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    gap: 2,
  },
});
