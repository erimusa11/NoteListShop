import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrioritySelector } from '@/components/PrioritySelector';
import { colors, radii, spacing } from '@/theme/theme';
import type { Task } from '@/types/models';
import { DEFAULT_PRIORITY, normalizePriority } from '@/utils/priority';
import type { TaskFields } from '@/utils/tasks';

/** What the sheet is showing: a new task (`task` null) or an existing one. `key` changes with every opening, so the form starts fresh. */
export interface TaskSheetState {
  task: Task | null;
  open: boolean;
  key: number;
}

interface TaskSheetProps {
  sheet: TaskSheetState;
  onClose: () => void;
  onSave: (fields: TaskFields) => void;
  onDelete: () => void;
}

export function TaskSheet({ sheet, onClose, onSave, onDelete }: TaskSheetProps) {
  return (
    <BottomSheet visible={sheet.open} onClose={onClose} title={sheet.task ? 'Ndrysho detyrën' : 'Detyrë e re'}>
      <TaskForm key={sheet.key} task={sheet.task} onSave={onSave} onDelete={onDelete} />
    </BottomSheet>
  );
}

function TaskForm({ task, onSave, onDelete }: Pick<TaskSheetProps, 'onSave' | 'onDelete'> & { task: Task | null }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [importance, setImportance] = useState<number>(normalizePriority(task?.importance ?? DEFAULT_PRIORITY));
  // Deleting takes a second tap, so a stray touch cannot remove a task.
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = title.trim().length > 0;
  const save = () => {
    if (canSave) onSave({ title, description, importance });
  };

  return (
    <>
      <Text style={styles.label}>Titulli</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="P.sh. Paguaj faturën e dritave"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus={!task}
        returnKeyType="next"
        maxLength={120}
      />

      <Text style={[styles.label, styles.gap]}>Përshkrimi (opsionale)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Detaje shtesë…"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.multiline]}
        multiline
        textAlignVertical="top"
        maxLength={500}
      />

      <View style={styles.gap}>
        <Text style={styles.label}>Rëndësia (5 = më e rëndësishmja)</Text>
        <PrioritySelector value={importance} onChange={setImportance} />
      </View>

      <Pressable onPress={save} disabled={!canSave} style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={styles.saveText}>{task ? 'Ruaj ndryshimet' : 'Shto detyrën'}</Text>
      </Pressable>

      {task && (
        <Pressable
          onPress={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          accessibilityRole="button"
          style={[styles.delete, confirmDelete && styles.deleteConfirm]}
        >
          <Text style={[styles.deleteText, confirmDelete && styles.deleteConfirmText]}>
            {confirmDelete ? 'Shtyp përsëri për ta fshirë' : 'Fshi detyrën'}
          </Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 2 },
  gap: { marginTop: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  multiline: { minHeight: 72, maxHeight: 120 },
  save: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  delete: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  deleteConfirm: { backgroundColor: colors.danger, borderColor: colors.danger },
  deleteText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  deleteConfirmText: { color: '#FFFFFF' },
});
