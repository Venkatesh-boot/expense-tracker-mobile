import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Preferences } from '../models';
import { loadLastSyncInfo } from '../database';
import {
  discoverFamilyHosts,
  formatSyncStatsSummary,
  generatePairingPin,
  getLocalWifiIp,
  isLocalSyncSupported,
  startWifiSyncHost,
  syncWithFamilyHost,
} from '../localSync';
import type {
  DiscoveredHost,
  HostInfo,
  SyncCompletionResult,
} from '../localSync';
import { AppIcon } from '../components/AppIcon';
import { SectionHeading } from '../components/SectionHeading';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';

type SyncMode = 'join' | 'host';

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

/** Provides 1-tap peer-to-peer expense synchronization over home Wi-Fi or mobile hotspot. */
export function WifiSyncScreen({
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
  const supported = isLocalSyncSupported();

  const [mode, setMode] = useState<SyncMode>('join');
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncPeer, setLastSyncPeer] = useState<string | null>(null);

  const [hostStarting, setHostStarting] = useState(false);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [hostResult, setHostResult] = useState<SyncCompletionResult | null>(null);
  const [hostError, setHostError] = useState('');
  const stopHostRef = useRef<(() => Promise<void>) | null>(null);

  const [scanning, setScanning] = useState(false);
  const [discoveredHosts, setDiscoveredHosts] = useState<DiscoveredHost[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [selectedIp, setSelectedIp] = useState('');
  const [selectedPort, setSelectedPort] = useState('45456');
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [joinResult, setJoinResult] = useState<SyncCompletionResult | null>(null);
  const [joinError, setJoinError] = useState('');

  const refreshMetadata = useCallback(async () => {
    const [ip, syncInfo] = await Promise.all([
      getLocalWifiIp(),
      loadLastSyncInfo(),
    ]);
    setLocalIp(ip);
    setLastSyncAt(syncInfo.lastSyncAt);
    setLastSyncPeer(syncInfo.lastSyncPeer);
  }, []);

  useEffect(() => {
    void refreshMetadata();
    return () => {
      const stop = stopHostRef.current;
      stopHostRef.current = null;
      if (stop) {
        void stop();
      }
    };
  }, [refreshMetadata]);

  const stopHosting = async () => {
    const stop = stopHostRef.current;
    stopHostRef.current = null;
    setHostInfo(null);
    if (stop) {
      try {
        await stop();
      } catch {
        // Ignore cleanup errors
      }
    }
  };

  const handleModeChange = async (nextMode: SyncMode) => {
    if (nextMode === mode) return;
    if (nextMode !== 'host' && stopHostRef.current) {
      await stopHosting();
    }
    setMode(nextMode);
  };

  const startHosting = async () => {
    setHostError('');
    setHostResult(null);
    setHostStarting(true);
    try {
      await stopHosting();
      const pin = generatePairingPin();
      const started = await startWifiSyncHost({
        hostName: preferences.displayName,
        pin,
        onSynced: async (result) => {
          setHostResult(result);
          setHostError('');
          await onSyncComplete();
          await refreshMetadata();
        },
        onError: (message) => {
          setHostError(message);
        },
      });
      stopHostRef.current = started.stop;
      setHostInfo(started.host);
      setLocalIp(started.host.ip);
    } catch (error) {
      setHostError(
        error instanceof Error ? error.message : 'Could not start Wi-Fi hosting.'
      );
    } finally {
      setHostStarting(false);
    }
  };

  const handleDiscover = async () => {
    setJoinError('');
    setJoinResult(null);
    setScanning(true);
    try {
      const hosts = await discoverFamilyHosts(1800);
      setDiscoveredHosts(hosts);
      setHasScanned(true);
      if (hosts.length > 0) {
        setSelectedIp(hosts[0].ip);
        setSelectedPort(String(hosts[0].port));
      } else if (!selectedIp) {
        setShowManualAddress(true);
      }
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : 'Could not search the Wi-Fi network.'
      );
    } finally {
      setScanning(false);
    }
  };

  const handleSyncNow = async () => {
    setJoinError('');
    setJoinResult(null);
    const parsedPort = Number.parseInt(selectedPort.trim(), 10) || 45456;
    setSyncing(true);
    try {
      const result = await syncWithFamilyHost({
        ip: selectedIp,
        port: parsedPort,
        pin: pinInput,
        senderName: preferences.displayName,
      });
      setJoinResult(result);
      await onSyncComplete();
      await refreshMetadata();
      Alert.alert(
        'Sync complete',
        `Synced with ${result.peerName}. ${formatSyncStatsSummary(result.stats)}`
      );
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : 'Could not complete Wi-Fi sync.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const lastSyncFormatted = formatSyncTimestamp(lastSyncAt);
  const usingDefaultName = preferences.displayName.trim().toLowerCase() === 'you';

  return (
    <ScrollView
      contentContainerStyle={styles.pageContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>LOCAL SYNC</Text>
      <Text style={styles.pageTitle}>Wi-Fi family sync</Text>
      <Text style={styles.pageSubtitle}>
        Sync expenses directly over home Wi-Fi or mobile hotspot with no cloud server.
      </Text>

      <View style={styles.profileBanner}>
        <View style={styles.profileBannerText}>
          <Text style={styles.profileBannerLabel}>Syncing as {preferences.displayName}</Text>
          <Text style={styles.profileBannerMeta}>
            Currency: {preferences.currency}
            {localIp ? `  •  Wi-Fi IP: ${localIp}` : ''}
          </Text>
          {lastSyncFormatted ? (
            <Text style={styles.profileBannerMeta}>
              Last synced {lastSyncPeer ? `with ${lastSyncPeer} ` : ''}on {lastSyncFormatted}
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
            Tip: Set "Your name" in Settings (instead of "You") before syncing so both phones know who added each expense.
          </Text>
        </View>
      ) : null}

      {!supported ? (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <AppIcon name="wifi" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Available in Android App</Text>
          </View>
          <Text style={styles.bodyText}>
            Direct Wi-Fi phone-to-phone sync uses local network sockets available in the installed Android app. On web, use Settings to export or import JSON backups.
          </Text>
        </View>
      ) : (
        <>
          <SectionHeading title="Choose role" />
          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.modeTab, mode === 'join' && styles.modeTabActive]}
              onPress={() => void handleModeChange('join')}
            >
              <Text style={[styles.modeTabText, mode === 'join' && styles.modeTabTextActive]}>
                Sync with Host
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeTab, mode === 'host' && styles.modeTabActive]}
              onPress={() => void handleModeChange('host')}
            >
              <Text style={[styles.modeTabText, mode === 'host' && styles.modeTabTextActive]}>
                Host on This Phone
              </Text>
            </Pressable>
          </View>

          {mode === 'host' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Share from this phone</Text>
              <Text style={styles.bodyText}>
                Start Host mode on one phone, then open Wi-Fi family sync → Sync with Host on your family member's phone and enter the 4-digit PIN.
              </Text>

              {hostInfo ? (
                <View style={styles.hostActiveBox}>
                  <Text style={styles.pinCaption}>PAIRING PIN</Text>
                  <Text style={styles.pinValue}>{hostInfo.pin.split('').join(' ')}</Text>
                  <Text style={styles.hostAddressText}>
                    {hostInfo.ip
                      ? `Wi-Fi Address: ${hostInfo.ip}  •  Port: ${hostInfo.port}`
                      : `Listening on Port ${hostInfo.port} (connect to Wi-Fi or Hotspot)`}
                  </Text>
                  <Text style={styles.hostWaitingText}>
                    Waiting for another family phone on the same Wi-Fi…
                  </Text>
                </View>
              ) : null}

              {hostError ? <Text style={styles.errorText}>{hostError}</Text> : null}

              {hostResult ? (
                <View style={styles.successBox}>
                  <Text style={styles.successTitle}>
                    Synced with {hostResult.peerName}
                  </Text>
                  <Text style={styles.successBody}>
                    {formatSyncStatsSummary(hostResult.stats)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.buttonRow}>
                {hostInfo ? (
                  <>
                    <Pressable
                      style={[styles.secondaryButton, styles.rowButton]}
                      onPress={() => void startHosting()}
                      disabled={hostStarting}
                    >
                      <Text style={styles.secondaryButtonText}>New PIN</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.dangerOutlineButton, styles.rowButton]}
                      onPress={() => void stopHosting()}
                    >
                      <Text style={styles.dangerOutlineText}>Stop Hosting</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => void startHosting()}
                    disabled={hostStarting}
                  >
                    {hostStarting ? (
                      <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Start Hosting Sync</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connect to host phone</Text>
              <Text style={styles.bodyText}>
                Both phones merge automatically — new, edited, and deleted expenses sync in both directions without duplicates.
              </Text>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => void handleDiscover()}
                disabled={scanning || syncing}
              >
                {scanning ? (
                  <View style={styles.inlineSpinnerRow}>
                    <ActivityIndicator size="small" color={colors.ink} />
                    <Text style={styles.secondaryButtonText}>Searching Wi-Fi…</Text>
                  </View>
                ) : (
                  <Text style={styles.secondaryButtonText}>Find Family Phone on Wi-Fi</Text>
                )}
              </Pressable>

              {discoveredHosts.length > 0 ? (
                <View style={styles.hostList}>
                  {discoveredHosts.map((host) => {
                    const selected =
                      selectedIp === host.ip && selectedPort === String(host.port);
                    return (
                      <Pressable
                        key={`${host.ip}:${host.port}`}
                        style={[
                          styles.hostItem,
                          selected && styles.hostItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedIp(host.ip);
                          setSelectedPort(String(host.port));
                        }}
                      >
                        <View style={styles.hostItemText}>
                          <Text style={styles.hostItemName}>{host.name}</Text>
                          <Text style={styles.hostItemMeta}>
                            {host.ip}:{host.port}
                          </Text>
                        </View>
                        {selected ? (
                          <AppIcon name="check" size={18} color={colors.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : hasScanned ? (
                <Text style={styles.mutedText}>
                  No host answered auto-discovery. Make sure Host mode is running on the other phone, or enter its IP below.
                </Text>
              ) : null}

              <Pressable
                style={styles.manualToggle}
                onPress={() => setShowManualAddress((current) => !current)}
              >
                <Text style={styles.manualToggleText}>
                  {showManualAddress
                    ? 'Hide manual IP & port'
                    : 'Enter host IP manually'}
                </Text>
              </Pressable>

              {showManualAddress ? (
                <View style={styles.manualFieldsRow}>
                  <View style={styles.ipField}>
                    <Text style={styles.fieldLabel}>Host IP address</Text>
                    <TextInput
                      style={styles.input}
                      value={selectedIp}
                      onChangeText={setSelectedIp}
                      placeholder="192.168.1.5"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.portField}>
                    <Text style={styles.fieldLabel}>Port</Text>
                    <TextInput
                      style={styles.input}
                      value={selectedPort}
                      onChangeText={setSelectedPort}
                      placeholder="45456"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              ) : null}

              <View>
                <Text style={styles.fieldLabel}>4-Digit PIN shown on host phone</Text>
                <TextInput
                  style={[styles.input, styles.pinInput]}
                  value={pinInput}
                  onChangeText={(text) => setPinInput(text.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="0000"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              {joinError ? <Text style={styles.errorText}>{joinError}</Text> : null}

              {joinResult ? (
                <View style={styles.successBox}>
                  <Text style={styles.successTitle}>
                    Synced with {joinResult.peerName}
                  </Text>
                  <Text style={styles.successBody}>
                    {formatSyncStatsSummary(joinResult.stats)}
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.primaryButton, syncing && styles.buttonDisabled]}
                onPress={() => void handleSyncNow()}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>Sync Expenses Now</Text>
                )}
              </Pressable>
            </View>
          )}
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
    modeTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceTint,
      borderRadius: 14,
      padding: 4,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeTab: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: 'center',
    },
    modeTabActive: {
      backgroundColor: colors.surface,
    },
    modeTabText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.muted,
    },
    modeTabTextActive: {
      color: colors.primary,
      fontWeight: '800',
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
    mutedText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.muted,
    },
    hostActiveBox: {
      backgroundColor: colors.primaryLight,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      alignItems: 'center',
      gap: 6,
    },
    pinCaption: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: colors.primary,
    },
    pinValue: {
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 4,
      color: colors.ink,
    },
    hostAddressText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.ink,
      textAlign: 'center',
    },
    hostWaitingText: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    rowButton: {
      flex: 1,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 15,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      flex: 1,
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    buttonDisabled: {
      opacity: 0.6,
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
    inlineSpinnerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    hostList: {
      gap: 8,
    },
    hostItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      padding: 12,
      backgroundColor: colors.background,
    },
    hostItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    hostItemText: {
      gap: 2,
    },
    hostItemName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
    },
    hostItemMeta: {
      fontSize: 12,
      color: colors.muted,
    },
    manualToggle: {
      alignSelf: 'flex-start',
      paddingVertical: 2,
    },
    manualToggleText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    manualFieldsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    ipField: {
      flex: 2,
      gap: 6,
    },
    portField: {
      flex: 1,
      gap: 6,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 6,
    },
    input: {
      minHeight: 48,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      paddingHorizontal: 13,
      color: colors.ink,
      fontSize: 14,
    },
    pinInput: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: 6,
      textAlign: 'center',
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
  });
