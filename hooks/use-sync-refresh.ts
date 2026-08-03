import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';

import { subscribeSyncCompletion } from '@/services/sync-events';

/**
 * Reloads screen data when the screen regains focus AND whenever a background
 * sync completes while the screen is mounted, so remote changes made on
 * another device appear without an app restart.
 */
export const useSyncRefresh = (
  loadData: () => Promise<void> | void,
) => {
  const stableLoad = useCallback(() => {
    void Promise.resolve(loadData()).catch(error => {
      console.error('Data load failed:', error);
    });
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      stableLoad();
    }, [stableLoad]),
  );

  useEffect(
    () => subscribeSyncCompletion(() => {
      stableLoad();
    }),
    [stableLoad],
  );
};
