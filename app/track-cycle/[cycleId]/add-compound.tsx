import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/cycle/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Fonts, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addCycleCompound, Compound, getCompounds } from '@/services/database';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const FREQUENCY_PRESETS = [
  { days: '1', label: 'Daily' },
  { days: '2', label: 'EOD' },
  { days: '3', label: 'E3D' },
  { days: '7', label: 'Weekly' },
];

const COMPOUND_ICONS: Record<Compound['type'], 'needle' | 'pill' | 'test-tube'> = {
  injectable: 'needle',
  oral: 'pill',
  peptide: 'test-tube',
};

export default function AddCompoundScreen() {
  const { cycleId } = useLocalSearchParams();
  const router = useRouter();

  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null);
  const [amount, setAmount] = useState('');
  const [amountUnit, setAmountUnit] = useState<'mg' | 'iu' | 'mcg'>('mg');
  const [dosingPeriod, setDosingPeriod] = useState('7'); // Default weekly
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 84)));
  const [search, setSearch] = useState('');

  const [showCompoundModal, setShowCompoundModal] = useState(false);

  const { colors, accents } = useTheme();
  const accent = accents.cycle;

  useEffect(() => {
    getCompounds().then(setCompounds);
  }, []);

  const filteredCompounds = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? compounds.filter(c => c.name.toLowerCase().includes(query)) : compounds;
  }, [compounds, search]);

  const compoundSections = useMemo(() => {
    const groupOrder: { type: Compound['type']; title: string }[] = [
      { type: 'injectable', title: 'Injectables' },
      { type: 'oral', title: 'Orals' },
      { type: 'peptide', title: 'Peptides' },
    ];

    return groupOrder
      .map(group => ({
        title: group.title,
        data: filteredCompounds.filter(c => c.type === group.type),
      }))
      .filter(section => section.data.length > 0);
  }, [filteredCompounds]);

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    const parsedDosingPeriod = Number(dosingPeriod);

    if (!selectedCompound) {
      Alert.alert('Missing compound', 'Please select a compound');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount');
      return;
    }
    if (!Number.isInteger(parsedDosingPeriod) || parsedDosingPeriod < 1) {
      Alert.alert('Invalid frequency', 'Dosing period must be a whole number of days');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('Invalid dates', 'End date must be on or after the start date');
      return;
    }

    await addCycleCompound(
      Number(cycleId),
      selectedCompound.id,
      selectedCompound.name,
      parsedAmount,
      amountUnit,
      parsedDosingPeriod,
      startDate.toISOString(),
      endDate.toISOString()
    );
    router.back();
  };

  const selectCompound = (item: Compound) => {
    setSelectedCompound(item);
    setShowCompoundModal(false);
    setSearch('');
    // Set default unit based on type
    if (item.type === 'peptide') setAmountUnit('mcg');
    else if (item.name.includes('HGH') || item.name.includes('HCG')) setAmountUnit('iu');
    else setAmountUnit('mg');
  };

  const renderCompoundItem = ({ item }: { item: Compound }) => {
    const isSelected = selectedCompound?.id === item.id;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        style={({ pressed }) => [
          styles.compoundItem,
          { borderBottomColor: colors.border },
          pressed && { backgroundColor: colors.cardMuted },
        ]}
        onPress={() => selectCompound(item)}
      >
        <IconBadge icon={COMPOUND_ICONS[item.type]} color={accent} size={36} />
        <ThemedText style={styles.compoundName}>{item.name}</ThemedText>
        {isSelected && <MaterialCommunityIcons name="check" size={20} color={accent} />}
      </Pressable>
    );
  };

  return (
    <FormScreen
      eyebrow="Cycle"
      title="Add compound"
      accent={accent}
      footer={<Button label="Add to cycle" size="lg" color={accent} onPress={handleSave} />}>
      <Card style={styles.card}>
        <View style={styles.field}>
          <ThemedText type="caption" tone="muted" style={styles.fieldLabel}>Compound</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selectedCompound ? `Compound: ${selectedCompound.name}` : 'Select compound'}
            style={({ pressed }) => [styles.selector, { backgroundColor: colors.cardMuted }, pressed && styles.pressed]}
            onPress={() => setShowCompoundModal(true)}
          >
            {selectedCompound ? (
              <>
                <IconBadge icon={COMPOUND_ICONS[selectedCompound.type]} color={accent} size={32} />
                <View style={styles.selectorText}>
                  <ThemedText type="defaultSemiBold">{selectedCompound.name}</ThemedText>
                  <ThemedText type="caption" tone="muted" style={styles.capitalize}>{selectedCompound.type}</ThemedText>
                </View>
              </>
            ) : (
              <ThemedText tone="subtle" style={styles.selectorText}>Select a compound</ThemedText>
            )}
            <MaterialCommunityIcons name="chevron-down" size={22} color={colors.subtleText} />
          </Pressable>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.row}>
          <TextField
            label="Amount"
            containerStyle={styles.flex}
            placeholder="e.g. 250"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <View style={styles.unitColumn}>
            <ThemedText type="caption" tone="muted" style={styles.fieldLabel}>Unit</ThemedText>
            <SegmentedControl
              options={[
                { value: 'mg', label: 'mg' },
                { value: 'iu', label: 'iu' },
                { value: 'mcg', label: 'mcg' },
              ]}
              value={amountUnit}
              onChange={setAmountUnit}
            />
          </View>
        </View>

        <View style={styles.field}>
          <TextField
            label="Dose every"
            suffix="days"
            value={dosingPeriod}
            onChangeText={setDosingPeriod}
            keyboardType="number-pad"
          />
          <View style={styles.presets}>
            {FREQUENCY_PRESETS.map(preset => {
              const isSelected = dosingPeriod === preset.days;
              return (
                <Pressable
                  key={preset.days}
                  onPress={() => setDosingPeriod(preset.days)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.preset,
                    { backgroundColor: isSelected ? withAlpha(accent, 0.14) : colors.cardMuted },
                    isSelected && { borderColor: accent },
                  ]}>
                  <ThemedText type="caption" style={[styles.presetText, { color: isSelected ? accent : colors.text }]}>
                    {preset.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <DateField label="Start date" value={startDate} onChange={setStartDate} />
        <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={startDate} />
      </Card>

      <Sheet
        visible={showCompoundModal}
        onClose={() => setShowCompoundModal(false)}
        title="Select compound"
        scrollable={false}
        heightRatio={0.8}
      >
        <TextField icon="magnify" placeholder="Search compounds" value={search} onChangeText={setSearch} autoCorrect={false} />
        <SectionList
          sections={compoundSections}
          renderItem={renderCompoundItem}
          keyExtractor={(item) => item.id.toString()}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <ThemedText type="overline" tone="subtle" style={styles.groupHeader}>
              {section.title}
            </ThemedText>
          )}
          ListEmptyComponent={
            <ThemedText tone="muted" style={styles.noResults}>No compounds match “{search}”</ThemedText>
          }
        />
      </Sheet>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: Fonts?.sansMedium,
  },
  selector: {
    minHeight: 56,
    borderRadius: Radii.control,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    flex: 1,
    paddingLeft: 2,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  pressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  unitColumn: {
    width: 150,
    gap: 6,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
  },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: Radii.inner,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetText: {
    fontFamily: Fonts?.sansBold,
  },
  compoundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compoundName: {
    flex: 1,
  },
  groupHeader: {
    paddingTop: 16,
    paddingBottom: 6,
  },
  noResults: {
    textAlign: 'center',
    paddingVertical: 24,
  },
});
