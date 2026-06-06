import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { changePin } from '@/api/services';
import { AppButton } from '@/components/AppButton';
import { AppDialog } from '@/components/AppDialog';

export default function GantiPinScreen() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);

  async function submit() {
    setSubmitting(true);

    try {
      const response = await changePin({
        current_pin: currentPin,
        new_pin: newPin,
        new_pin_confirmation: confirmPin,
      });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setDialog({ title: 'Berhasil', message: response.message, variant: 'success' });
    } catch (error) {
      if (error instanceof ApiError) {
        setDialog({ title: 'Gagal', message: Object.values(error.errors).flat()[0] ?? error.message, variant: 'error' });
      } else {
        setDialog({ title: 'Gagal', message: error instanceof Error ? error.message : 'PIN gagal diganti.', variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ganti PIN</Text>
      <View style={styles.section}>
        <TextInput value={currentPin} onChangeText={setCurrentPin} placeholder="PIN lama" keyboardType="number-pad" secureTextEntry style={styles.input} placeholderTextColor="#8ba0a8" />
        <TextInput value={newPin} onChangeText={setNewPin} placeholder="PIN baru" keyboardType="number-pad" secureTextEntry style={styles.input} placeholderTextColor="#8ba0a8" />
        <TextInput value={confirmPin} onChangeText={setConfirmPin} placeholder="Konfirmasi PIN baru" keyboardType="number-pad" secureTextEntry style={styles.input} placeholderTextColor="#8ba0a8" />
        <AppButton label={submitting ? 'Menyimpan...' : 'Simpan PIN'} icon="save" onPress={submit} loading={submitting} />
      </View>
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        variant={dialog?.variant}
        onClose={() => setDialog(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  section: { gap: 10, borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#c7d6dd', borderRadius: 8, paddingHorizontal: 12, color: '#15323d' },
});
