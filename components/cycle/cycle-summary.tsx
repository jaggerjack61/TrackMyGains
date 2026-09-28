import React from 'react';
import { StyleSheet, View } from 'react-native';

import { getCycleProgress, type CycleStatus } from '@/components/cycle/cycle-progress';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STATUS_LABELS: Record<CycleStatus, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
};

export function CycleStatusChip({ status, accent }: { status: CycleStatus; accent: string }) {
  const { scheme, colors } = useTheme();
  const color = status === 'active' ? accent : colors.mutedText;
  const backgroundColor = status === 'active' ? withAlpha(accent, scheme === 'dark' ? 0.18 : 0.12) : colors.cardMuted;

  return (
    <View style={[styles.chip, { backgroundColor }]}>
      {status === 'active' && <View style={[styles.chipDot, { backgroundColor: accent }]} />}
      <ThemedText type="caption" style={[styles.chipText, { color }]}>
        {STATUS_LABELS[status]}
      </ThemedText>
    </View>
  );
}

/** Progress bar plus "Week X of Y" for a cycle's date range. */
export function CycleProgressBar({ startDate, endDate, accent }: { startDate: string; endDate: string; accent: string }) {
  const { colors } = useTheme();
  const { status, progress, currentWeek, totalWeeks } = getCycleProgress(startDate, endDate);

  const caption =
    status === 'upcoming'
      ? `${totalWeeks} weeks · not started`
      : status === 'completed'
        ? `${totalWeeks} weeks · finished`
        : `Week ${currentWeek} of ${totalWeeks}`;

  return (
    <View style={styles.progress}>
      <View style={[styles.track, { backgroundColor: colors.cardMuted }]}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accent }]} />
      </View>
      <View style={styles.progressLabels}>
        <ThemedText type="caption" tone="muted">
          {caption}
        </ThemedText>
        <ThemedText type="caption" tone="subtle">
          {Math.round(progress * 100)}%
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontFamily: Fonts?.sansBold,
    fontSize: 12,
  },
  progress: {
    gap: 8,
  },
  track: {
    height: 8,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
