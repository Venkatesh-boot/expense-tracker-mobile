import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Expense, FamilyMember } from '../models';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { AppIcon } from '../components/AppIcon';
import { ChoiceChip } from '../components/ChoiceChip';
import { SectionHeading } from '../components/SectionHeading';

type FamilyScreenProps = {
  members: FamilyMember[];
  expenses: Expense[];
  selfId: string;
  onAddMember: (name: string) => Promise<void>;
  onRenameMember: (id: string, name: string) => Promise<void>;
  onRemoveMember: (id: string, reassignToId: string) => Promise<void>;
};

export function FamilyScreen({
  members,
  expenses,
  selfId,
  onAddMember,
  onRenameMember,
  onRemoveMember,
}: FamilyScreenProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [renamingMember, setRenamingMember] = useState<FamilyMember | null>(null);
  const [renameText, setRenameText] = useState('');
  const [removingMember, setRemovingMember] = useState<FamilyMember | null>(null);
  const [reassignToId, setReassignToId] = useState('');

  const expenseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expense of expenses) {
      counts.set(expense.paidBy, (counts.get(expense.paidBy) || 0) + 1);
    }
    return counts;
  }, [expenses]);

  const add = async () => {
    const value = name.trim();
    if (!value) {
      Alert.alert('Enter a name', 'Add the family member’s name.');
      return;
    }
    if (members.some((member) => member.name.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      Alert.alert('Already added', 'There is already a family member with that name.');
      return;
    }
    setSaving(true);
    try {
      await onAddMember(value);
      setName('');
    } catch (error) {
      Alert.alert('Could not add member', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openRename = (member: FamilyMember) => {
    setRenamingMember(member);
    setRenameText(member.name);
  };

  const submitRename = async () => {
    if (!renamingMember) return;
    const value = renameText.trim();
    if (!value) {
      Alert.alert('Enter a name', 'Family member name cannot be empty.');
      return;
    }
    if (
      members.some(
        (member) =>
          member.id !== renamingMember.id &&
          member.name.toLocaleLowerCase() === value.toLocaleLowerCase()
      )
    ) {
      Alert.alert('Name already used', 'Another family member already has that name.');
      return;
    }
    setSaving(true);
    try {
      await onRenameMember(renamingMember.id, value);
      setRenamingMember(null);
    } catch (error) {
      Alert.alert('Could not rename member', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openRemove = (member: FamilyMember) => {
    const fallbackTarget = members.find((other) => other.id !== member.id)?.id ?? '';
    setReassignToId(fallbackTarget);
    setRemovingMember(member);
  };

  const confirmRemove = async () => {
    if (!removingMember || !reassignToId) return;
    setSaving(true);
    try {
      await onRemoveMember(removingMember.id, reassignToId);
      setRemovingMember(null);
    } catch (error) {
      Alert.alert('Could not remove member', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removingCount = removingMember ? expenseCounts.get(removingMember.id) || 0 : 0;

  return (
    <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>YOUR HOUSEHOLD</Text>
      <Text style={styles.pageTitle}>Family members</Text>
      <Text style={styles.pageSubtitle}>Keep track of who paid for each expense.</Text>

      <View style={styles.addMemberCard}>
        <Text style={styles.cardTitle}>Add someone</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Family member name"
          placeholderTextColor={colors.placeholder}
          maxLength={100}
          returnKeyType="done"
          onSubmitEditing={() => void add()}
        />
        <Pressable
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={() => void add()}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Adding…' : 'Add family member'}</Text>
        </Pressable>
      </View>

      <SectionHeading title={`Members (${members.length})`} />
      <View style={styles.card}>
        {members.map((member, index) => {
          const isSelf = member.id === selfId;
          const count = expenseCounts.get(member.id) || 0;
          return (
            <View key={member.id} style={[styles.memberRow, index === members.length - 1 && styles.noBorder]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberMeta}>
                  {isSelf ? 'Primary profile · ' : ''}
                  {count} {count === 1 ? 'expense' : 'expenses'}
                </Text>
              </View>
              <View style={styles.memberActions}>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => openRename(member)}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename ${member.name}`}
                >
                  <AppIcon name="edit" color={colors.primary} size={15} />
                </Pressable>
                {!isSelf && members.length > 1 ? (
                  <Pressable
                    style={[styles.iconButton, styles.iconButtonDanger]}
                    onPress={() => openRemove(member)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.name}`}
                  >
                    <AppIcon name="trash" color={colors.danger} size={15} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>No account or server needed</Text>
        <Text style={styles.infoText}>
          Members and expenses are saved only on this device. To share them with another family phone, export a backup in Settings and import it there.
        </Text>
      </View>

      <Modal
        transparent
        visible={renamingMember !== null}
        animationType="fade"
        onRequestClose={() => setRenamingMember(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRenamingMember(null)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Rename family member</Text>
            <TextInput
              style={styles.input}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Name"
              placeholderTextColor={colors.placeholder}
              maxLength={100}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRenamingMember(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSave, saving && styles.disabledButton]}
                onPress={() => void submitRename()}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Saving…' : 'Save name'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={removingMember !== null}
        animationType="fade"
        onRequestClose={() => setRemovingMember(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRemovingMember(null)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Remove {removingMember?.name}?</Text>
            <Text style={styles.modalCopy}>
              {removingCount > 0
                ? `${removingMember?.name} has ${removingCount} ${removingCount === 1 ? 'expense' : 'expenses'}. Choose who those expenses should be reassigned to:`
                : 'This member has no recorded expenses and will be removed from this device.'}
            </Text>
            {removingCount > 0 ? (
              <View style={styles.chipWrap}>
                {members
                  .filter((member) => member.id !== removingMember?.id)
                  .map((member) => (
                    <ChoiceChip
                      key={member.id}
                      label={member.name}
                      selected={reassignToId === member.id}
                      onPress={() => setReassignToId(member.id)}
                    />
                  ))}
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRemovingMember(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalDanger, saving && styles.disabledButton]}
                onPress={() => void confirmRemove()}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Removing…' : 'Remove'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pageContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
    pageTitle: { color: colors.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    pageSubtitle: { color: colors.muted, fontSize: 13, marginBottom: 18 },
    addMemberCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 },
    cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15, marginBottom: 8 },
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
    primaryButton: { backgroundColor: colors.primary, minHeight: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 14, paddingHorizontal: 16 },
    primaryButtonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
    disabledButton: { opacity: 0.6 },
    card: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
    memberRow: { flexDirection: 'row', alignItems: 'center', minHeight: 68, borderBottomWidth: 1, borderBottomColor: colors.border },
    noBorder: { borderBottomWidth: 0 },
    avatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.purpleLight, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
    avatarText: { color: colors.purple, fontWeight: '800' },
    memberInfo: { flex: 1, marginRight: 8 },
    memberName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
    memberMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
    memberActions: { flexDirection: 'row', gap: 8 },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonDanger: {
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerLight,
    },
    infoCard: { padding: 16, borderRadius: 18, backgroundColor: colors.surfaceTint, marginTop: 16 },
    infoTitle: { color: colors.ink, fontWeight: '800', fontSize: 14, marginBottom: 7 },
    infoText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    modalBackdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: 22 },
    modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border },
    modalTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 10 },
    modalCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 12 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    modalCancel: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12 },
    modalCancelText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
    modalSave: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
    modalDanger: { backgroundColor: colors.danger, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
    modalSaveText: { color: colors.onPrimary, fontWeight: '800', fontSize: 13 },
  });
