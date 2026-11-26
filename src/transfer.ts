import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import type { CurrencyCode } from './models';
import { createBackup, loadExpenses, loadMembers, loadPreferences, mergeBackup } from './database';
import { formatExpensesCsv, MAX_BACKUP_SIZE, parseBackup } from './transferUtils';

export { formatExpensesCsv, parseBackup };

const EXPORT_FILE_PREFIX = 'family-expenses-';

export async function exportBackup(): Promise<void> {
  const backup = await createBackup();
  const filename = `${EXPORT_FILE_PREFIX}${Date.now()}.json`;
  const content = JSON.stringify(backup, null, 2);
  await shareOrDownloadFile(filename, content, 'application/json', 'Share family expense backup', 'public.json');
}

/** Exports all expenses on this device as a CSV spreadsheet. */
export async function exportCsv(): Promise<void> {
  const [expenses, members, preferences] = await Promise.all([
    loadExpenses(),
    loadMembers(),
    loadPreferences(),
  ]);
  const filename = `${EXPORT_FILE_PREFIX}${Date.now()}.csv`;
  const content = formatExpensesCsv(expenses, members, preferences.currency);
  await shareOrDownloadFile(filename, content, 'text/csv', 'Share family expenses CSV', 'public.comma-separated-values-text');
}

async function shareOrDownloadFile(
  filename: string,
  content: string,
  mimeType: string,
  dialogTitle: string,
  UTI: string
): Promise<void> {
  if (Platform.OS === 'web') {
    downloadOnWeb(filename, content, mimeType);
    return;
  }

  cleanupStaleExports();
  const outFile = new File(Paths.cache, filename);
  outFile.create({ overwrite: true });
  await outFile.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }
  await Sharing.shareAsync(outFile.uri, {
    mimeType,
    dialogTitle,
    UTI,
  });
}

function cleanupStaleExports(): void {
  try {
    for (const entry of Paths.cache.list()) {
      if (
        entry instanceof File &&
        entry.name.startsWith(EXPORT_FILE_PREFIX) &&
        (entry.name.endsWith('.json') || entry.name.endsWith('.csv'))
      ) {
        try {
          entry.delete();
        } catch {
          // Ignore locked or already-removed cache entries.
        }
      }
    }
  } catch {
    // Cache directory listing is best-effort cleanup.
  }
}

function downloadOnWeb(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Browser file download is not available in this environment.');
  }
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importBackup(): Promise<{
  cancelled: true;
} | {
  cancelled: false;
  expensesAdded: number;
  membersAdded: number;
  currencyChanged: boolean;
  currency: CurrencyCode;
}> {
  const selection = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'public.json'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (selection.canceled) {
    return { cancelled: true };
  }

  const file = selection.assets[0];
  if (file.size !== undefined && file.size > MAX_BACKUP_SIZE) {
    throw new Error('The selected backup is larger than the 25 MB limit.');
  }

  let contents: string;
  if (Platform.OS === 'web') {
    if (file.file) {
      contents = await file.file.text();
    } else {
      const response = await fetch(file.uri);
      contents = await response.text();
    }
  } else {
    contents = await new File(file.uri).text();
  }

  const backup = parseBackup(contents);
  const result = await mergeBackup(backup);
  return {
    cancelled: false,
    ...result,
    currency: backup.preferences.currency,
  };
}
