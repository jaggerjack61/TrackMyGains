/**
 * Tiny in-process event bus for sync lifecycle events.
 * Screens subscribe so they can refresh when a background sync completes
 * (e.g. remote changes pulled while the app is idle or in the foreground).
 */

export type SyncCompletionStatus = 'success' | 'failed';

export type SyncCompletionListener = (
  status: SyncCompletionStatus,
) => void;

const listeners = new Set<SyncCompletionListener>();

export const subscribeSyncCompletion = (
  listener: SyncCompletionListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifySyncCompletion = (status: SyncCompletionStatus) => {
  for (const listener of [...listeners]) {
    listener(status);
  }
};
