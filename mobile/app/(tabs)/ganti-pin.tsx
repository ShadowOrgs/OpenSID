import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { changePin } from '@/api/services';

export default function GantiPinScreen() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await changePin({
        current_pin: currentPin,
        new_pin: newPin,
        new_pin_confirmation: confirmPin,
      });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(Object.values(error.errors).flat()[0] ?? error.message);
      } else {
        setMessage(error instanceof Error ? error.message : 'PIN gagal diganti.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ganti PIN</Text>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      <View style={styles.section}>
        <TextInput value={currentPin} onChangeText={setCurrentPin} placeholder="PIN lama" keyboardType="number-pad" secureTextEntry style={styles.input} placeholderTextColor="#8ba0a8" />
        <TextInput value={newPin} onChangeText={setNewPin} placeholder="PIN baru" keyboardType="number-pad" secureTextEntry style={styles.input} placeholderTextColor="#8ba0a8" />
        <TextInput value={confirmPin} onChangeText={setConfirmPin} placeholder="Konfirmasi PIN baru" keyboardType="number-pad" secureTextEntry style={styles.input} placeholderTextColor="#8ba0a8" />
        <Pressable style={[styles.button, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Menyimpan...' : 'Simpan PIN'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  notice: { borderRadius: 8, backgroundColor: '#e7f7f4', color: '#006b63', padding: 12, fontWeight: '700' },
  section: { gap: 10, borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#c7d6dd', borderRadius: 8, paddingHorizontal: 12, color: '#15323d' },
  button: { alignItems: 'center', borderRadius: 8, backgroundColor: '#00945f', paddingVertical: 13 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '800' },
});
