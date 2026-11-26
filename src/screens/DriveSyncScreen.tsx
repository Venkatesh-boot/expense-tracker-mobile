import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Preferences } from '../models';
import { loadLastSyncInfo } from '../database';
import {
  checkLinkedFileAccess,
  connectExistingDriveFile,
  createLinkedDriveFile,
  formatSyncStatsSummary,
  isDriveSyncSupported,
  shareSyncSnapshotFallback,
  syncWithLinkedDriveFile,
  unlinkDriveSyncFile,
} from '../driveSync';
import type { DriveSyncResult } from '../driveSync';
import { AppIcon } from '../components/AppIcon';
import { SectionHeading } from '../components/SectionHeading';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';

function formatSyncTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Zero-config Google Drive file sync using Android Storage Access Framework and LWW merge. */
export function DriveSyncScreen({
  preferences,
  onSyncComplete,
  onOpenSettings,
}: {
  preferences: Preferences;
  onSyncComplete: () => Promise<void>;
  onOpenSettings: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const supported = isDriveSyncSupported();

  const [linkedUri, setLinkedUri] = useState<string | null>(null);
  const [linkedName, setLinkedName] = useState<string | null>(null);
  const [fileAccessible, setFileAccessible] = useState<boolean>(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'create' | 'open' | 'sync' | null>(null);
  const [syncResult, setSyncResult] = useState<DriveSyncResult | null>(null);
  const [errorText, setErrorText] = useState('');

  const refreshState = useCallback(async () => {
    const info = await loadLastSyncInfo();
    setLinkedUri(info.syncFileUri);
    setLinkedName(info.syncFileName);
    setLastSyncAt(info.lastSyncAt);
    if (info.syncFileUri) {
      const status = await checkLinkedFileAccess();
      setFileAccessible(status.accessible);
      if (status.name) {
        setLinkedName(status.name);
      }
    } else {
      setFileAccessible(false);
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const handleCreateFile = async () => {
    setErrorText('');
    setSyncResult(null);
    setBusyAction('create');
    try {
      const created = await createLinkedDriveFile();
      if (created.cancelled) return;
      await refreshState();
      Alert.alert(
        'Sync file created',
        `Saved "${created.name}". Now share this file in Google Drive with your family member (as Editor), then choose "Connect Shared Drive File" on their phone.`
      );
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : 'Could not create Drive sync file.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleConnectExisting = async () => {
    setErrorText('');
    setSyncResult(null);
    setBusyAction('open');
    try {
      const result = await connectExistingDriveFile();
      if (result.cancelled) return;
      setSyncResult(result);
      await onSyncComplete();
      await refreshState();
      Alert.alert(
        result.uploaded ? 'Connected & synced' : 'Merged onto this phone',
        result.uploaded
          ? `Connected to "${result.fileName}". ${formatSyncStatsSummary(result.stats)}`
          : result.warning || formatSyncStatsSummary(result.stats)
      );
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : 'Could not connect Drive sync file.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSyncNow = async () => {
    setErrorText('');
    setSyncResult(null);
    setBusyAction('sync');
    try {
      const result = await syncWithLinkedDriveFile();
      setSyncResult(result);
      await onSyncComplete();
      await refreshState();
      if (result.uploaded) {
        Alert.alert(
          'Google Drive synced',
          formatSyncStatsSummary(result.stats)
        );
      }
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : 'Could not sync with the linked file.'
      );
      await refreshState();
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnlink = async () => {
    setErrorText('');
    setSyncResult(null);
    await unlinkDriveSyncFile();
    await refreshState();
  };

  const handleShareFallback = async () => {
    try {
      await shareSyncSnapshotFallback();
    } catch (error) {
      Alert.alert(
        'Share failed',
        error instanceof Error ? error.message : 'Could not share merged sync file.'
      );
    }
  };

  const lastSyncFormatted = formatSyncTimestamp(lastSyncAt);
  const usingDefaultName = preferences.displayName.trim().toLowerCase() === 'you';

  return (
    <ScrollView
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>CLOUD BACKUP & SYNC</Text>
      <Text style={styles.pageTitle}>Google Drive sync</Text>
      <Text style={styles.pageSubtitle}>
        Keep both phones updated anywhere over mobile data or Wi-Fi using one shared file in your own Google Drive.
      </Text>

      <View style={styles.profileBanner}>
        <View style={styles.profileBannerText}>
          <Text style={styles.profileBannerLabel}>Syncing as {preferences.displayName}</Text>
          <Text style={styles.profileBannerMeta}>
            Currency: {preferences.currency}
          </Text>
          {lastSyncFormatted ? (
            <Text style={styles.profileBannerMeta}>
              Last synced: {lastSyncFormatted}
            </Text>
          ) : null}
        </View>
        {usingDefaultName ? (
          <Pressable style={styles.inlineLinkButton} onPress={onOpenSettings}>
            <Text style={styles.inlineLinkText}>Set name</Text>
          </Pressable>
        ) : null}
      </View>

      {usingDefaultName ? (
        <View style={styles.tipBanner}>
          <Text style={styles.tipBannerText}>
            Tip: Set "Your name" in Settings (instead of "You") before syncing so both phones clearly show who paid for each expense.
          </Text>
        </View>
      ) : null}

      {!supported ? (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <AppIcon name="cloud" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Available in Android App</Text>
          </View>
          <Text style={styles.bodyText}>
            Direct Google Drive file linking uses Android's document picker in the installed app. On web, use Settings → Export / Import JSON.
          </Text>
        </View>
      ) : (
        <>
          {linkedUri ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <AppIcon name="cloud" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Linked Drive File</Text>
              </View>
              <View style={styles.linkedBox}>
                <Text style={styles.linkedFileName}>
                  {linkedName || 'family-expenses-sync.json'}
                </Text>
                <Text style={styles.linkedMeta}>
                  {fileAccessible
                    ? 'Ready for 1-tap two-way sync'
                    : 'Permission expired — tap "Re-link Drive File" below'}
                </Text>
              </View>

              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

              {syncResult ? (
                <View style={syncResult.uploaded ? styles.successBox : styles.warningBox}>
                  <Text style={syncResult.uploaded ? styles.successTitle : styles.warningTitle}>
                    {syncResult.uploaded
                      ? 'Two-way sync complete'
                      : 'Merged onto this phone (read-only Drive file)'}
                  </Text>
                  <Text style={styles.successBody}>
                    {formatSyncStatsSummary(syncResult.stats)}
                  </Text>
                  {syncResult.warning ? (
                    <>
                      <Text style={styles.warningDetail}>{syncResult.warning}</Text>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => void handleShareFallback()}
                      >
                        <Text style={styles.secondaryButtonText}>Save Merged Copy to Drive</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : null}

              <Pressable
                style={[styles.primaryButton, busyAction !== null && styles.buttonDisabled]}
                onPress={() => void handleSyncNow()}
                disabled={busyAction !== null}
              >
                {busyAction === 'sync' ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>Sync with Google Drive Now</Text>
                )}
              </Pressable>

              <View style={styles.secondaryActionsRow}>
                <Pressable
                  style={[styles.secondaryButton, styles.rowButton]}
                  onPress={() => void handleConnectExisting()}
                  disabled={busyAction !== null}
                >
                  <Text style={styles.secondaryButtonText}>Re-link File</Text>
                </Pressable>
                <Pressable
                  style={[styles.dangerOutlineButton, styles.rowButton]}
                  onPress={() => void handleUnlink()}
                  disabled={busyAction !== null}
                >
                  <Text style={styles.dangerOutlineText}>Unlink</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connect a shared Drive sync file</Text>
              <Text style={styles.bodyText}>
                Both phones merge automatically — additions, edits, and deletions stay in sync with no duplicates and no sign-in server.
              </Text>

              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

              <Pressable
                style={[styles.primaryButton, busyAction !== null && styles.buttonDisabled]}
                onPress={() => void handleCreateFile()}
                disabled={busyAction !== null}
              >
                {busyAction === 'create' ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>1. Create New Sync File in Drive</Text>
                )}
              </Pressable>

              <Pressable
                style={[styles.secondaryButton, busyAction !== null && styles.buttonDisabled]}
                onPress={() => void handleConnectExisting()}
                disabled={busyAction !== null}
              >
                {busyAction === 'open' ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.secondaryButtonText}>2. Connect Shared Drive File</Text>
                )}
              </Pressable>
            </View>
          )}

          <SectionHeading title="First-time setup (2 phones)" />
          <View style={styles.stepsCard}>
            <Text style={styles.stepLine}>
              1. On Phone 1, tap "Create New Sync File in Drive" and pick a folder in your Google Drive.
            </Text>
            <Text style={styles.stepLine}>
              2. Open the Google Drive app, share that "family-expenses-sync.json" file with your family member, and give them "Editor" permission.
            </Text>
            <Text style={styles.stepLine}>
              3. On Phone 2, tap "Connect Shared Drive File", open Google Drive → "Shared with me", and select that same file.
            </Text>
            <Text style={styles.stepLine}>
              4. From then on, either phone can tap "Sync with Google Drive Now" anytime!
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pageContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
      gap: 12,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
    },
    pageTitle: {
      color: colors.ink,
      fontSize: 26,
      fontWeight: '800',
    },
    pageSubtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 4,
    },
    profileBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    profileBannerText: {
      flex: 1,
      gap: 3,
    },
    profileBannerLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
    },
    profileBannerMeta: {
      fontSize: 12,
      color: colors.muted,
    },
    inlineLinkButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
    },
    inlineLinkText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
    },
    tipBanner: {
      backgroundColor: colors.amberLight,
      borderRadius: 14,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipBannerText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.ink,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.ink,
    },
    bodyText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.muted,
    },
    linkedBox: {
      backgroundColor: colors.primaryLight,
      borderRadius: 13,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      gap: 4,
    },
    linkedFileName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
    },
    linkedMeta: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 15,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    secondaryActionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    rowButton: {
      flex: 1,
    },
    secondaryButton: {
      backgroundColor: colors.surfaceTint,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      borderRadius: 13,
      minHeight: 46,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    dangerOutlineButton: {
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerLight,
      borderRadius: 13,
      minHeight: 46,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerOutlineText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '700',
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      lineHeight: 18,
    },
    successBox: {
      backgroundColor: colors.successLight,
      borderRadius: 13,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.success,
      gap: 4,
    },
    successTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.success,
    },
    successBody: {
      fontSize: 13,
      color: colors.ink,
    },
    warningBox: {
      backgroundColor: colors.amberLight,
      borderRadius: 13,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.amber,
      gap: 6,
    },
    warningTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.amber,
    },
    warningDetail: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
    },
    stepsCard: {
      backgroundColor: colors.surfaceTint,
      borderRadius: 16,
      padding: 15,
      gap: 8,
    },
    stepLine: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.ink,
    },
  });
