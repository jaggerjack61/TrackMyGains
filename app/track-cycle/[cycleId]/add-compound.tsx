import { Header } from '@/components/Header';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, SectionList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { addCycleCompound, Compound, getCompounds } from '@/services/database';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    getCompounds().then(setCompounds);
  }, []);

  const compoundSections = useMemo(() => {
    const groupOrder: { type: Compound['type']; title: string }[] = [
      { type: 'injectable', title: 'Injectables' },
      { type: 'oral', title: 'Orals' },
      { type: 'peptide', title: 'Peptides' },
    ];

    return groupOrder
      .map(group => ({
        title: group.title,
        data: compounds.filter(c => c.type === group.type),
      }))
      .filter(section => section.data.length > 0);
  }, [compounds]);

  const handleSave = async () => {
    if (!selectedCompound) {
      alert('Please select a compound');
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      alert('Please enter a valid amount');
      return;
    }
    if (!dosingPeriod || isNaN(Number(dosingPeriod))) {
      alert('Please enter a valid dosing period');
      return;
    }

    await addCycleCompound(
      Number(cycleId),
      selectedCompound.id,
      selectedCompound.name,
      Number(amount),
      amountUnit,
      Number(dosingPeriod),
      startDate.toISOString(),
      endDate.toISOString()
    );
    router.back();
  };

  const renderCompoundItem = ({ item }: { item: Compound }) => (
    <TouchableOpacity
      style={styles.compoundItem}
      onPress={() => {
        setSelectedCompound(item);
        setShowCompoundModal(false);
        // Set default unit based on type
        if (item.type === 'peptide') setAmountUnit('mcg');
        else if (item.name.includes('HGH') || item.name.includes('HCG')) setAmountUnit('iu');
        else setAmountUnit('mg');
      }}
    >
      <ThemedText>{item.name}</ThemedText>
      <ThemedText style={{ opacity: 0.6, fontSize: 12 }}>{item.type}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <Header title="Add Compound" />

      <View style={styles.form}>
        {/* Compound Selector */}
        <View style={styles.inputGroup}>
          <ThemedText type="subtitle">Compound</ThemedText>
          <TouchableOpacity
            style={[styles.selectorButton, { borderColor: iconColor }]}
            onPress={() => setShowCompoundModal(true)}
          >
            <ThemedText>{selectedCompound ? selectedCompound.name : 'Select Compound'}</ThemedText>
            <MaterialCommunityIcons name="chevron-down" size={24} color={iconColor} />
          </TouchableOpacity>
        </View>

        {/* Amount & Unit */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <ThemedText type="subtitle">Amount</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: iconColor }]}
              placeholder="e.g. 250"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="subtitle">Unit</ThemedText>
            <View style={styles.unitContainer}>
              {(['mg', 'iu', 'mcg'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitButton,
                    amountUnit === u && { backgroundColor: tintColor },
                    { borderColor: iconColor }
                  ]}
                  onPress={() => setAmountUnit(u)}
                >
                  <ThemedText style={[styles.unitText, amountUnit === u && { color: 'white' }]}>
                    {u}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Dosing Period */}
        <View style={styles.inputGroup}>
          <ThemedText type="subtitle">Dosing Frequency (Days)</ThemedText>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, color: textColor, borderColor: iconColor }]}
              value={dosingPeriod}
              onChangeText={setDosingPeriod}
              keyboardType="numeric"
            />
            <ThemedText style={{ alignSelf: 'center', marginLeft: 8 }}>days</ThemedText>
          </View>
          <ThemedText style={styles.hint}>e.g., 1 = Daily, 2 = EOD, 7 = Weekly</ThemedText>
        </View>

        {/* Dates */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="subtitle">Start</ThemedText>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: iconColor }]}
              onPress={() => setShowStartPicker(true)}
            >
              <ThemedText>{startDate.toLocaleDateString()}</ThemedText>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) setStartDate(date);
                }}
              />
            )}
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="subtitle">End</ThemedText>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: iconColor }]}
              onPress={() => setShowEndPicker(true)}
            >
              <ThemedText>{endDate.toLocaleDateString()}</ThemedText>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) setEndDate(date);
                }}
                minimumDate={startDate}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: tintColor }]}
          onPress={handleSave}
        >
          <ThemedText style={styles.saveButtonText}>Add to Cycle</ThemedText>
        </TouchableOpacity>
      </View>

      <Modal visible={showCompoundModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Select Compound</ThemedText>
              <TouchableOpacity onPress={() => setShowCompoundModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <SectionList
              sections={compoundSections}
              renderItem={renderCompoundItem}
              keyExtractor={(item) => item.id.toString()}
              renderSectionHeader={({ section }) => (
                <ThemedText type="subtitle" style={[styles.groupHeader, { color: textColor }]}>
                  {section.title}
                </ThemedText>
              )}
            />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  unitButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 12,
  },
  hint: {
    fontSize: 12,
    opacity: 0.6,
  },
  saveButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  compoundItem: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  groupHeader: {
    paddingTop: 10,
    paddingBottom: 6,
    opacity: 0.9,
  },
});
