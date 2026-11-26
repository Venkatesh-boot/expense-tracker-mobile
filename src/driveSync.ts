import { NativeModules, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  applyMergedSyncSnapshot,
  clearLinkedSyncFile,
  exportSyncSnapshot,
  loadLastSyncInfo,
  recordLastSyncAt,
  saveLinkedSyncFile,
} from './database';
import type { SyncMergeStats, SyncSnapshot } from './models';
import { mergeSyncSnapshots, parseSyncSnapshot } from './syncUtils';
import { parseBackup } from './transferUtils';

type PickerResult =
  | { cancelled: true }
  | { cancelled: false; uri: string; name: string };

type SafSyncNativeModule = {
  createSyncFile(suggestedName: string): Promise<PickerResult>;
  openSyncFile(): Promise<PickerResult>;
  readSyncFile(uriString: string): Promise<string>;
  writeSyncFile(uriString: string, content: string): Promise<boolean>;
  getFileStatus(uriString: string): Promise<{ name: string | null; accessible: boolean }>;
};

export type DriveSyncResult = {
  cancelled?: boolean;
  fileName: string;
  stats: SyncMergeStats;
  uploaded: boolean;
  warning?: string;
};

const DEFAULT_SYNC_FILENAME = 'family-expenses-sync.json';

function getSafModule(): SafSyncNativeModule | null {
  if (Platform.OS !== 'android') return null;
  const mod = NativeModules.SafSync as SafSyncNativeModule | undefined;
  return mod ?? null;
}

/** Returns true when Android Storage Access Framework sync is supported. */
export function isDriveSyncSupported(): boolean {
  return getSafModule() !== null;
}

/** Formats sync merge counters into a concise human-readable summary. */
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
    return 'Everything was already up to date.';
  }
  return parts.join(' • ');
}

function parseRemoteContent(rawText: string): SyncSnapshot | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('The linked Drive file is not valid JSON.');
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    'syncVersion' in parsed
  ) {
    return parseSyncSnapshot(parsed);
  }

  // Also allow connecting an older v2 manual JSON backup seamlessly.
  const backup = parseBackup(trimmed);
  const nowIso = backup.exportedAt || new Date().toISOString();
  return {
    app: 'family-expense-tracker',
    syncVersion: 1,
    deviceId: 'legacy-backup',
    exportedAt: nowIso,
    currency: backup.preferences.currency,
    members: backup.members.map((m) => ({ ...m, updatedAt: '1970-01-01T00:00:00.000Z' })),
    expenses: backup.expenses.map((e) => ({
      ...e,
      updatedAt: e.createdAt || nowIso,
      deletedAt: null,
    })),
  };
}

/**
 * Prompts the user to create `family-expenses-sync.json` inside their Google Drive
 * (or device storage) and uploads this phone's current expenses immediately.
 */
export async function createLinkedDriveFile(): Promise<
  { cancelled: true } | { cancelled: false; uri: string; name: string }
> {
  const mod = getSafModule();
  if (!mod) {
    throw new Error('Google Drive file sync is only available in the Android app.');
  }

  const picked = await mod.createSyncFile(DEFAULT_SYNC_FILENAME);
  if (picked.cancelled) {
    return { cancelled: true };
  }

  const snapshot = await exportSyncSnapshot();
  await mod.writeSyncFile(picked.uri, JSON.stringify(snapshot, null, 2));
  await saveLinkedSyncFile(picked.uri, picked.name);
  await recordLastSyncAt(picked.name);
  return picked;
}

/** Merges local state with a linked file URI and writes the merged snapshot back. */
async function performBidirectionalFileSync(
  mod: SafSyncNativeModule,
  uri: string,
  fileName: string
): Promise<DriveSyncResult> {
  const [localSnapshot, rawRemoteText] = await Promise.all([
    exportSyncSnapshot(),
    mod.readSyncFile(uri),
  ]);

  const remoteSnapshot = parseRemoteContent(rawRemoteText);
  const merged = remoteSnapshot
    ? mergeSyncSnapshots(localSnapshot, remoteSnapshot)
    : {
        snapshot: localSnapshot,
        stats: {
          membersAdded: 0,
          membersUpdated: 0,
          expensesAdded: 0,
          expensesUpdated: 0,
          expensesDeleted: 0,
          currencyAdopted: false,
        },
      };

  let uploaded = true;
  let warning: string | undefined;
  try {
    await mod.writeSyncFile(uri, JSON.stringify(merged.snapshot, null, 2));
  } catch (error) {
    uploaded = false;
    warning =
      error instanceof Error
        ? error.message
        : 'Pulled changes onto this phone, but Google Drive did not allow saving updates back to the file.';
  }

  await applyMergedSyncSnapshot(merged.snapshot, fileName);

  return {
    fileName,
    stats: merged.stats,
    uploaded,
    warning,
  };
}

/**
 * Prompts the user to select an existing shared `family-expenses-sync.json` in Google Drive,
 * remembers the link, and performs an initial bidirectional merge.
 */
export async function connectExistingDriveFile(): Promise<DriveSyncResult> {
  const mod = getSafModule();
  if (!mod) {
    throw new Error('Google Drive file sync is only available in the Android app.');
  }

  const picked = await mod.openSyncFile();
  if (picked.cancelled) {
    return {
      cancelled: true,
      fileName: '',
      stats: {
        membersAdded: 0,
        membersUpdated: 0,
        expensesAdded: 0,
        expensesUpdated: 0,
        expensesDeleted: 0,
        currencyAdopted: false,
      },
      uploaded: false,
    };
  }

  const result = await performBidirectionalFileSync(mod, picked.uri, picked.name);
  await saveLinkedSyncFile(picked.uri, picked.name);
  return result;
}

/** Syncs bidirectionally with the currently linked Google Drive file in one tap. */
export async function syncWithLinkedDriveFile(): Promise<DriveSyncResult> {
  const mod = getSafModule();
  if (!mod) {
    throw new Error('Google Drive file sync is only available in the Android app.');
  }

  const info = await loadLastSyncInfo();
  if (!info.syncFileUri) {
    throw new Error('Link a Google Drive sync file first.');
  }

  return performBidirectionalFileSync(
    mod,
    info.syncFileUri,
    info.syncFileName || DEFAULT_SYNC_FILENAME
  );
}

/** Checks whether the previously linked Google Drive file URI is still readable. */
export async function checkLinkedFileAccess(): Promise<{
  accessible: boolean;
  name: string | null;
}> {
  const mod = getSafModule();
  const info = await loadLastSyncInfo();
  if (!mod || !info.syncFileUri) {
    return { accessible: false, name: info.syncFileName };
  }
  return mod.getFileStatus(info.syncFileUri);
}

/** Shares the current merged sync snapshot so a user can save/replace it manually in Drive. */
export async function shareSyncSnapshotFallback(): Promise<void> {
  const snapshot = await exportSyncSnapshot();
  const outFile = new File(Paths.cache, DEFAULT_SYNC_FILENAME);
  outFile.create({ overwrite: true });
  await outFile.write(JSON.stringify(snapshot, null, 2));
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(outFile.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save merged sync file to Google Drive',
    UTI: 'public.json',
  });
}

/** Removes the saved link to the Drive sync file without deleting any local expenses. */
export async function unlinkDriveSyncFile(): Promise<void> {
  await clearLinkedSyncFile();
}
