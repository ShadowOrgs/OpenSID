import { register } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type PickedFile = { uri: string; name: string; type: string };

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    nama: '',
    tanggallahir: '',
    nik: '',
    no_kk: '',
    email: '',
    telegram: '',
    password: '',
    password_confirmation: '',
  });
  const [files, setFiles] = useState<Record<string, PickedFile | null>>({ scan_1: null, scan_2: null, scan_3: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function pickFile(key: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    setFiles((current) => ({
      ...current,
      [key]: {
        uri: asset.uri,
        name: asset.fileName ?? `${key}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      },
    }));
  }

  async function submit() {
    if (!files.scan_1 || !files.scan_2 || !files.scan_3) {
      setError('Scan KTP, Scan KK, dan Foto selfie wajib diunggah.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await register({
        ...form,
        scan_1: files.scan_1,
        scan_2: files.scan_2,
        scan_3: files.scan_3,
      });
      await signIn(response.data);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Pendaftaran gagal: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Daftar Layanan Mandiri</Text>
      <Field label="Nama" value={form.nama} onChangeText={(value) => update('nama', value)} />
      <Field label="Tanggal lahir YYYY-MM-DD" value={form.tanggallahir} onChangeText={(value) => update('tanggallahir', value)} />
      <Field label="NIK" value={form.nik} onChangeText={(value) => update('nik', value)} keyboardType="number-pad" maxLength={16} />
      <Field label="Nomor KK" value={form.no_kk} onChangeText={(value) => update('no_kk', value)} keyboardType="number-pad" maxLength={16} />
      <Field label="Email" value={form.email} onChangeText={(value) => update('email', value)} keyboardType="email-address" />
      <Field label="Telegram opsional" value={form.telegram} onChangeText={(value) => update('telegram', value)} keyboardType="number-pad" />
      <Field label="PIN 6 digit" value={form.password} onChangeText={(value) => update('password', value)} keyboardType="number-pad" secureTextEntry maxLength={6} />
      <Field label="Konfirmasi PIN" value={form.password_confirmation} onChangeText={(value) => update('password_confirmation', value)} keyboardType="number-pad" secureTextEntry maxLength={6} />

      <UploadButton label="Scan KTP" file={files.scan_1} onPress={() => pickFile('scan_1')} />
      <UploadButton label="Scan KK" file={files.scan_2} onPress={() => pickFile('scan_2')} />
      <UploadButton label="Foto selfie dengan KTP" file={files.scan_3} onPress={() => pickFile('scan_3')} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Buat Akun</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Field(props: ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} autoCapitalize="none" {...inputProps} />
    </View>
  );
}

function UploadButton({ label, file, onPress }: { label: string; file: PickedFile | null; onPress: () => void }) {
  return (
    <Pressable style={styles.upload} onPress={onPress}>
      <Text style={styles.uploadLabel}>{label}</Text>
      <Text style={styles.uploadText}>{file ? file.name : 'Pilih gambar'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d', marginBottom: 18 },
  field: { marginBottom: 12 },
  label: { fontWeight: '700', color: '#31515e', marginBottom: 6 },
  input: { height: 46, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#d9e3e8' },
  upload: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9e3e8', padding: 12, marginBottom: 10 },
  uploadLabel: { fontWeight: '700', color: '#31515e' },
  uploadText: { color: '#607d89', marginTop: 4 },
  error: { color: '#c62828', marginVertical: 12 },
  button: { height: 48, borderRadius: 8, backgroundColor: '#009966', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
