import * as Network from 'expo-network';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getSyncStatus, requestSync, subscribeSyncStatus, type SyncStatus } from '@/sync/engine';
import { onLocalChange } from '@/sync/outbox';

// Wait this long after the last local change, so typing several cards causes one sync, not several.
const DEBOUNCE_MS = 1500;
// Also picks up changes made on other devices while this one is just sitting open.
const INTERVAL_MS = 60_000;

// Mounted once while the user is signed in. Decides *when* to sync; the engine decides *how*.
export function useAutoSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    void requestSync();

    // 1. The app comes back to the foreground.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void requestSync();
    });

    // 2. The connection comes back.
    const network = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void requestSync();
    });

    // 3. Something was written to the outbox.
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const unsubscribeLocal = onLocalChange(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => void requestSync(), DEBOUNCE_MS);
    });

    // 4. Periodically, while the app is open.
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void requestSync();
    }, INTERVAL_MS);

    return () => {
      appState.remove();
      network.remove();
      unsubscribeLocal();
      clearTimeout(debounce);
      clearInterval(interval);
    };
  }, [enabled]);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
}
