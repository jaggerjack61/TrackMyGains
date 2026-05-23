import { describe, expect, it } from '@jest/globals';

import {
  APK_FILENAME_REGEX,
  getLatestApk,
  isRemoteApkNewer,
  parseApkDate,
  ApkInfo,
} from './app-update-metadata';

describe('parseApkDate', () => {
  it('test_parseApkDate_validFilename_returnsDateString', () => {
    expect(parseApkDate('TrackMyGains-preview-20260523.apk')).toBe('20260523');
  });

  it('test_parseApkDate_validFilename_differentDate', () => {
    expect(parseApkDate('TrackMyGains-preview-20251201.apk')).toBe('20251201');
  });

  it('test_parseApkDate_invalidFilename_returnsNull', () => {
    expect(parseApkDate('random-file.apk')).toBeNull();
  });

  it('test_parseApkDate_wrongPrefix_returnsNull', () => {
    expect(parseApkDate('OtherApp-preview-20260523.apk')).toBeNull();
  });

  it('test_parseApkDate_missingDate_returnsNull', () => {
    expect(parseApkDate('TrackMyGains-preview-.apk')).toBeNull();
  });

  it('test_parseApkDate_nonNumericDate_returnsNull', () => {
    expect(parseApkDate('TrackMyGains-preview-2025abcd.apk')).toBeNull();
  });
});

describe('APK_FILENAME_REGEX', () => {
  it('test_apkRegex_trackMyGainsPreview_matchesDate', () => {
    const match = APK_FILENAME_REGEX.exec('TrackMyGains-preview-20260523.apk');
    expect(match).not.toBeNull();
    expect(match![1]).toBe('20260523');
  });

  it('test_apkRegex_otherFile_doesNotMatch', () => {
    expect(APK_FILENAME_REGEX.test('readme.md')).toBe(false);
    expect(APK_FILENAME_REGEX.test('app-release.apk')).toBe(false);
  });
});

describe('getLatestApk', () => {
  it('test_getLatestApk_emptyList_returnsNull', () => {
    expect(getLatestApk([])).toBeNull();
  });

  it('test_getLatestApk_singleItem_returnsThatItem', () => {
    const items: ApkInfo[] = [
      { name: 'TrackMyGains-preview-20260523.apk', download_url: 'https://example.com/a.apk' },
    ];
    const result = getLatestApk(items);
    expect(result).not.toBeNull();
    expect(result!.version_date).toBe('20260523');
    expect(result!.download_url).toBe('https://example.com/a.apk');
  });

  it('test_getLatestApk_multipleItems_returnsHighestDate', () => {
    const items: ApkInfo[] = [
      { name: 'TrackMyGains-preview-20260501.apk', download_url: 'https://example.com/a.apk' },
      { name: 'TrackMyGains-preview-20260523.apk', download_url: 'https://example.com/b.apk' },
      { name: 'TrackMyGains-preview-20260515.apk', download_url: 'https://example.com/c.apk' },
    ];
    const result = getLatestApk(items);
    expect(result).not.toBeNull();
    expect(result!.version_date).toBe('20260523');
    expect(result!.download_url).toBe('https://example.com/b.apk');
  });

  it('test_getLatestApk_ignoresNonMatchingFiles', () => {
    const items: ApkInfo[] = [
      { name: 'readme.md', download_url: 'https://example.com/readme' },
      { name: 'TrackMyGains-preview-20260523.apk', download_url: 'https://example.com/a.apk' },
      { name: 'package.json', download_url: 'https://example.com/pkg' },
    ];
    const result = getLatestApk(items);
    expect(result).not.toBeNull();
    expect(result!.version_date).toBe('20260523');
  });

  it('test_getLatestApk_allNonMatching_returnsNull', () => {
    const items: ApkInfo[] = [
      { name: 'readme.md', download_url: 'https://example.com/readme' },
      { name: 'package.json', download_url: 'https://example.com/pkg' },
    ];
    expect(getLatestApk(items)).toBeNull();
  });

  it('test_getLatestApk_currentDateToday_comparesCorrectly', () => {
    const later = '20261231';
    const earlier = '20260101';
    const items: ApkInfo[] = [
      { name: `TrackMyGains-preview-${earlier}.apk`, download_url: 'https://example.com/a.apk' },
      { name: `TrackMyGains-preview-${later}.apk`, download_url: 'https://example.com/b.apk' },
    ];
    const result = getLatestApk(items);
    expect(result!.version_date).toBe(later);
  });
});

describe('update comparison (remoteDate > localDate)', () => {
  it('test_updateAvailable_remoteNewer_returnsTrue', () => {
    expect(isRemoteApkNewer('20260523', '20260501')).toBe(true);
  });

  it('test_updateAvailable_remoteOlder_returnsFalse', () => {
    expect(isRemoteApkNewer('20260401', '20260501')).toBe(false);
  });

  it('test_updateAvailable_equalDates_returnsFalse', () => {
    expect(isRemoteApkNewer('20260523', '20260523')).toBe(false);
  });

  it('test_updateAvailable_nullLocal_treatedAsOlder', () => {
    expect(isRemoteApkNewer('20260523', null)).toBe(true);
  });

  it('test_updateAvailable_invalidLocalDate_treatedAsOlder', () => {
    expect(isRemoteApkNewer('20260523', 'not-a-date')).toBe(true);
  });

  it('test_updateAvailable_invalidRemoteDate_returnsFalse', () => {
    expect(isRemoteApkNewer('not-a-date', '20260523')).toBe(false);
  });
});
