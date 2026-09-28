import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBadge, type IconName } from '@/components/ui/icon-badge';
import { getElevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ListRowProps {
  icon: IconName;
  accent: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** True while the row is being dragged in a reorderable list. */
  isActive?: boolean;
}

/** Navigable row card with an icon, title and inline edit/delete actions. */
export function ListRow({
  icon,
  accent,
  title,
  subtitle,
  onPress,
  onLongPress,
  onEdit,
  onDelete,
  isActive = false,
}: ListRowProps) {
  const { scheme, colors } = useTheme();

  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={isActive}
      accessibilityLabel={title}
      style={[
        styles.row,
        isActive && [{ borderColor: accent, borderWidth: 1.5 }, getElevation(scheme, 3)],
      ]}>
      <IconBadge icon={icon} color={accent} />
      <View style={styles.text}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {onEdit && (
        <IconButton icon="pencil-outline" color={colors.mutedText} size={36} onPress={onEdit} accessibilityLabel={`Rename ${title}`} />
      )}
      {onDelete && (
        <IconButton icon="trash-can-outline" color={colors.danger} size={36} onPress={onDelete} accessibilityLabel={`Delete ${title}`} />
      )}
      {onPress && <MaterialCommunityIcons name="chevron-right" size={22} color={colors.subtleText} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    marginBottom: 10,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
