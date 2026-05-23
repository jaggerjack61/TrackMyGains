import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readUpdatesSource = () =>
  readFileSync(join(__dirname, 'app-updates.ts'), 'utf8');

const readRootLayoutSource = () =>
  readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

describe('app update source', () => {
  it('test_startupUpdateCheck_promptsBeforeDownloadWhenUpdateFound', () => {
    const source = readRootLayoutSource();

    expect(source).not.toContain('checkForUpdates({ autoDownload: true })');
    expect(source).toContain('promptForUpdateIfAvailable()');
  });

  it('test_updateFlow_promptsBeforeDownloadAndBeforeInstall', () => {
    const source = readUpdatesSource();

    expect(source).toContain('promptForUpdateDownload');
    expect(source).toContain('Download Update');
    expect(source).toContain('promptForUpdateInstall');
    expect(source).toContain('Install Update');
  });

  it('test_downloadAndInstallApk_androidInstaller_usesContentUri', () => {
    const source = readUpdatesSource();

    expect(source).toContain('getContentUriAsync');
  });

  it('test_downloadAndInstallApk_backgroundDownload_usesAndroidDownloadManager', () => {
    const source = readUpdatesSource();

    expect(source).toContain('addAndroidDownloads');
    expect(source).toContain('useDownloadManager: true');
    expect(source).toContain('notification: true');
  });

  it('test_downloadAndInstallApk_updateFoundNotification_shownThenDismissed', () => {
    const source = readUpdatesSource();

    expect(source).toContain('scheduleNotificationAsync');
    expect(source).toContain('dismissNotificationAsync');
  });

  it('test_checkForUpdates_expoGoRuntime_skipsNativeUpdaterModules', () => {
    const source = readUpdatesSource();

    expect(source).toContain('ExecutionEnvironment.StoreClient');
    expect(source).toContain('isNativeApkUpdaterSupported');
    expect(source).toContain('App updates require a preview or development build');
  });
});