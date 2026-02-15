import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, Alert, TouchableOpacity } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { exportDatabase, importDatabase } from '@/services/database';

export default function SettingsScreen() {
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  const handleExport = async () => {
    try {
      await exportDatabase();
    } catch (error: any) {
      Alert.alert('Export Failed', error.message);
    }
  };

  const handleImport = async () => {
    try {
      Alert.alert(
        'Confirm Import',
        'This will overwrite your current database with the selected file. This action cannot be undone. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Import', 
            style: 'destructive',
            onPress: async () => {
              try {
                await importDatabase();
                Alert.alert('Success', 'Database imported successfully. Please restart the app to ensure all data is loaded correctly.');
              } catch (error: any) {
                Alert.alert('Import Failed', error.message);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#6D28D9', dark: '#0F172A' }}
      headerImage={
        <View style={styles.header}>
          <MaterialCommunityIcons name="cog-outline" size={92} color="rgba(255,255,255,0.92)" />
          <View style={styles.headerText}>
            <ThemedText type="title" lightColor="#FFFFFF" darkColor="#FFFFFF">
              Settings
            </ThemedText>
            <ThemedText
              lightColor="rgba(255,255,255,0.82)"
              darkColor="rgba(255,255,255,0.82)"
              style={styles.tagline}>
              Manage your preferences
            </ThemedText>
          </View>
          <MaterialCommunityIcons
            name="cog"
            size={240}
            color="rgba(255,255,255,0.10)"
            style={styles.headerBgIcon}
          />
        </View>
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="subtitle">Data Management</ThemedText>
      </ThemedView>
      <ThemedText style={[styles.intro, { color: mutedTextColor }]}>
        Backup or restore your data.
      </ThemedText>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
            style={[styles.button, { backgroundColor: cardColor }]} 
            onPress={handleExport}
        >
            <MaterialCommunityIcons name="export" size={24} color={tintColor} style={styles.buttonIcon} />
            <View>
                <ThemedText type="defaultSemiBold">Export Database</ThemedText>
                <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>Save your data to a file</ThemedText>
            </View>
        </TouchableOpacity>

        <TouchableOpacity 
            style={[styles.button, { backgroundColor: cardColor, marginTop: 12 }]} 
            onPress={handleImport}
        >
            <MaterialCommunityIcons name="import" size={24} color={tintColor} style={styles.buttonIcon} />
            <View>
                <ThemedText type="defaultSemiBold">Import Database</ThemedText>
                <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>Restore data from a backup</ThemedText>
            </View>
        </TouchableOpacity>
      </View>
      
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  intro: {
    marginBottom: 20,
  },
  header: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    justifyContent: 'flex-end',
  },
  headerText: {
    marginTop: 12,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 20,
    maxWidth: 280,
  },
  headerBgIcon: {
    position: 'absolute',
    right: -70,
    top: -60,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 16,
  }
});
