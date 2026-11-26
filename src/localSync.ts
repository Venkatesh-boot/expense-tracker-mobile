import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import {
  applyMergedSyncSnapshot,
  exportSyncSnapshot,
} from './database';
import type { SyncMergeStats } from './models';
import { mergeSyncSnapshots, parseSyncSnapshot } from './syncUtils';

type LocalSyncNativeModule = {
  getLocalIp(): Promise<string | null>;
  startHost(hostName: string, pin: string): Promise<{ ip: string | null; port: number }>;
  stopHost(): Promise<boolean>;
  respondToSync(requestId: string, statusCode: Int32, jsonBody: string): Promise<boolean>;
  discoverHosts(timeoutMs: number): Promise<DiscoveredHost[]>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

type Int32 = number;

export type DiscoveredHost = {
  ip: string;
  port: number;
  name: string;
};

export type HostInfo = {
  ip: string | null;
  port: number;
  pin: string;
};

export type SyncCompletionResult = {
  peerName: string;
  peerIp: string;
  stats: SyncMergeStats;
};

type SyncRequestEvent = {
  requestId: string;
  payloadJson: string;
  remoteIp: string;
};

function getNativeSyncModule(): LocalSyncNativeModule | null {
  if (Platform.OS !== 'android') return null;
  const mod = NativeModules.LocalSync as LocalSyncNativeModule | undefined;
  return mod ?? null;
}

/** Returns true when the native Android local Wi-Fi sync module is available. */
export function isLocalSyncSupported(): boolean {
  return getNativeSyncModule() !== null;
}

/** Generates a random 4-digit pairing PIN between 1000 and 9999. */
export function generatePairingPin(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

/** Formats merge counters into a concise human-readable summary. */
export function formatSyncStatsSummary(stats: SyncMergeStats): string {
  const parts: string[] = [];
  if (stats.expensesAdded > 0) {
    parts.push(`${stats.expensesAdded} added`);
  }
  if (stats.expensesUpdated > 0) {
    parts.push(`${stats.expensesUpdated} updated`);
  }
  if (stats.expensesDeleted > 0) {
    parts.push(`${stats.expensesDeleted} deleted`);
  }
  if (stats.membersAdded > 0 || stats.membersUpdated > 0) {
    const memberChanges = stats.membersAdded + stats.membersUpdated;
    parts.push(`${memberChanges} family profile${memberChanges === 1 ? '' : 's'} updated`);
  }
  if (parts.length === 0) {
    return 'Both phones were already up to date.';
  }
  return parts.join(' • ');
}

/** Returns this phone's local Wi-Fi IPv4 address if connected. */
export async function getLocalWifiIp(): Promise<string | null> {
  const mod = getNativeSyncModule();
  if (!mod) return null;
  return mod.getLocalIp();
}

/** Scans the current home Wi-Fi subnet for active Family Expense Sync hosts. */
export async function discoverFamilyHosts(
  timeoutMs = 1800
): Promise<DiscoveredHost[]> {
  const mod = getNativeSyncModule();
  if (!mod) {
    throw new Error('Local Wi-Fi sync is only available in the Android app.');
  }
  return mod.discoverHosts(timeoutMs);
}

/**
 * Starts hosting a local Wi-Fi HTTP sync endpoint protected by a 4-digit PIN.
 * Automatically merges incoming family snapshots into local SQLite and returns the merged snapshot.
 */
export async function startWifiSyncHost(options: {
  hostName: string;
  pin: string;
  onSynced: (result: SyncCompletionResult) => void;
  onError: (message: string) => void;
}): Promise<{ host: HostInfo; stop: () => Promise<void> }> {
  const mod = getNativeSyncModule();
  if (!mod) {
    throw new Error('Local Wi-Fi sync is only available in the Android app.');
  }

  const hostName = options.hostName.trim() || 'Family Phone';
  const emitter = new NativeEventEmitter(mod);
  const subscription = emitter.addListener(
    'LocalSyncRequest',
    async (rawEvent: unknown) => {
      const event = rawEvent as SyncRequestEvent;
      try {
        const parsedBody = JSON.parse(event.payloadJson) as {
          senderName?: unknown;
          snapshot?: unknown;
        };
        const remoteSnapshot = parseSyncSnapshot(
          parsedBody && typeof parsedBody === 'object' && 'snapshot' in parsedBody
            ? parsedBody.snapshot
            : parsedBody
        );
        const peerName =
          typeof parsedBody?.senderName === 'string' && parsedBody.senderName.trim()
            ? parsedBody.senderName.trim()
            : 'Family Phone';

        const localSnapshot = await exportSyncSnapshot();
        const merged = mergeSyncSnapshots(localSnapshot, remoteSnapshot);
        await applyMergedSyncSnapshot(merged.snapshot, peerName);

        await mod.respondToSync(
          event.requestId,
          200,
          JSON.stringify({
            senderName: hostName,
            snapshot: merged.snapshot,
          })
        );
        options.onSynced({
          peerName,
          peerIp: event.remoteIp,
          stats: merged.stats,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Sync merge failed on this phone.';
        try {
          await mod.respondToSync(
            event.requestId,
            400,
            JSON.stringify({ error: message })
          );
        } catch {
          // Ignore socket already closed
        }
        options.onError(message);
      }
    }
  );

  try {
    const started = await mod.startHost(hostName, options.pin);
    return {
      host: {
        ip: started.ip,
        port: started.port,
        pin: options.pin,
      },
      stop: async () => {
        subscription.remove();
        await mod.stopHost();
      },
    };
  } catch (error) {
    subscription.remove();
    throw error;
  }
}

/** Connects to a hosting family phone over Wi-Fi and performs a bidirectional LWW merge. */
export async function syncWithFamilyHost(options: {
  ip: string;
  port: number;
  pin: string;
  senderName: string;
}): Promise<SyncCompletionResult> {
  const cleanIp = options.ip.trim();
  const cleanPin = options.pin.trim();
  if (!cleanIp) {
    throw new Error('Select a nearby phone or enter the host Wi-Fi IP address.');
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error('Enter a valid port number (default 45456).');
  }
  if (!/^\d{4}$/.test(cleanPin)) {
    throw new Error('Enter the 4-digit PIN shown on the host phone.');
  }

  const localSnapshot = await exportSyncSnapshot();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`http://${cleanIp}:${options.port}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Pin': cleanPin,
      },
      body: JSON.stringify({
        senderName: options.senderName.trim() || 'Family Phone',
        snapshot: localSnapshot,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    let body: { error?: unknown; senderName?: unknown; snapshot?: unknown } = {};
    try {
      body = text ? (JSON.parse(text) as typeof body) : {};
    } catch {
      body = {};
    }

    if (!response.ok) {
      const serverError =
        typeof body.error === 'string' && body.error.trim()
          ? body.error.trim()
          : `Host returned status ${response.status}.`;
      throw new Error(serverError);
    }

    const hostMergedSnapshot = parseSyncSnapshot(body.snapshot ?? body);
    const peerName =
      typeof body.senderName === 'string' && body.senderName.trim()
        ? body.senderName.trim()
        : cleanIp;

    const finalMerge = mergeSyncSnapshots(localSnapshot, hostMergedSnapshot);
    await applyMergedSyncSnapshot(finalMerge.snapshot, peerName);

    return {
      peerName,
      peerIp: cleanIp,
      stats: finalMerge.stats,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'Timed out waiting for the host phone. Make sure both phones are on the same Wi-Fi and hosting is still active.'
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
