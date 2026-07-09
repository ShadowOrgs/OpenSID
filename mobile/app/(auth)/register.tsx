import { getMobileHealth, register, type MobileHealth } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { AppButton } from '@/components/AppButton';
import { AppDialog } from '@/components/AppDialog';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';

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
  const [health, setHealth] = useState<MobileHealth | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant: 'error' | 'warning' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  useEffect(() => {
    getMobileHealth()
      .then((response) => setHealth(response.data))
      .catch(() => undefined);
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeBirthDate(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'dismissed') {
      setShowBirthPicker(false);
      return;
    }

    if (date) {
      update('tanggallahir', formatApiDate(date));
    }

    setShowBirthPicker(false);
  }

  async function pickFile(key: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      setDialog({ title: 'Perhatian', message: 'Scan KTP, Scan KK, dan Foto selfie wajib diunggah.', variant: 'warning' });
      return;
    }

    setLoading(true);

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
      setDialog({ title: 'Gagal', message: err instanceof ApiError ? err.message : `Pendaftaran gagal: ${String(err)}`, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoFrame}>
            {health?.desa.logo_url ? <Image source={{ uri: health.desa.logo_url }} style={styles.logo} /> : <Ionicons name="business" size={32} color="#0073b7" />}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.village}>{health?.desa.nama ?? 'OpenSID Mandiri'}</Text>
            <Text style={styles.subtitle}>Daftar Layanan Mandiri</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Penduduk</Text>
          <Field label="Nama" value={form.nama} onChangeText={(value) => update('nama', value)} />
          <DateField value={form.tanggallahir} onPress={() => setShowBirthPicker(true)} />
          {showBirthPicker ? (
            <DateTimePicker
              value={form.tanggallahir ? new Date(`${form.tanggallahir}T00:00:00`) : new Date(1990, 0, 1)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              onChange={changeBirthDate}
            />
          ) : null}
          <Field label="NIK" value={form.nik} onChangeText={(value) => update('nik', value)} keyboardType="number-pad" maxLength={16} />
          <Field label="Nomor KK" value={form.no_kk} onChangeText={(value) => update('no_kk', value)} keyboardType="number-pad" maxLength={16} />
          <Field label="Email" value={form.email} onChangeText={(value) => update('email', value)} keyboardType="email-address" />
          <Field label="Telegram opsional" value={form.telegram} onChangeText={(value) => update('telegram', value)} keyboardType="number-pad" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keamanan</Text>
          <Field label="PIN 6 digit" value={form.password} onChangeText={(value) => update('password', value)} keyboardType="number-pad" secureTextEntry maxLength={6} />
          <Field label="Konfirmasi PIN" value={form.password_confirmation} onChangeText={(value) => update('password_confirmation', value)} keyboardType="number-pad" secureTextEntry maxLength={6} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dokumen Verifikasi</Text>
          <UploadButton label="Scan KTP" file={files.scan_1} onPress={() => pickFile('scan_1')} />
          <UploadButton label="Scan KK" file={files.scan_2} onPress={() => pickFile('scan_2')} />
          <UploadButton label="Foto selfie dengan KTP" file={files.scan_3} onPress={() => pickFile('scan_3')} />
        </View>

        <AppButton label="Buat Akun" icon="person-add" onPress={submit} loading={loading} />
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#0073b7" />
          <Text style={styles.backText}>Kembali ke Login</Text>
        </Pressable>
        <AppDialog
          visible={dialog !== null}
          title={dialog?.title ?? ''}
          message={dialog?.message ?? ''}
          variant={dialog?.variant}
          onClose={() => setDialog(null)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DateField({ value, onPress }: { value: string; onPress: () => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Tanggal lahir</Text>
      <Pressable style={styles.dateButton} onPress={onPress}>
        <Text style={[styles.dateText, !value && styles.placeholderText]}>{value ? formatDisplayDate(value) : 'Pilih tanggal lahir'}</Text>
        <Ionicons name="calendar" size={20} color="#0073b7" />
      </Pressable>
    </View>
  );
}

function Field(props: ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} autoCapitalize="none" placeholderTextColor="#8ba0a8" {...inputProps} />
    </View>
  );
}

function UploadButton({ label, file, onPress }: { label: string; file: PickedFile | null; onPress: () => void }) {
  return (
    <Pressable style={styles.upload} onPress={onPress}>
      <View style={styles.uploadIcon}>
        <Ionicons name="image" size={22} color="#fff" />
      </View>
      <View style={styles.uploadBody}>
        <Text style={styles.uploadLabel}>{label}</Text>
        <Text style={styles.uploadText}>{file ? file.name : 'Pilih gambar'}</Text>
      </View>
    </Pressable>
  );
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`));
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#ecf0f5' },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, backgroundColor: '#fff', padding: 14, borderWidth: 1, borderColor: '#dce8ee' },
  logoFrame: { width: 62, height: 62, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5fbff', borderWidth: 1, borderColor: '#dce8ee' },
  logo: { width: 48, height: 48, resizeMode: 'contain' },
  headerText: { flex: 1 },
  village: { color: '#15323d', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#607d89', fontWeight: '700', marginTop: 4 },
  section: { gap: 10, borderRadius: 8, backgroundColor: '#fff', padding: 14, borderWidth: 1, borderColor: '#dce8ee' },
  sectionTitle: { color: '#15323d', fontSize: 16, fontWeight: '900' },
  field: { gap: 6 },
  label: { fontWeight: '700', color: '#31515e', marginBottom: 6 },
  input: { height: 46, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#d9e3e8', color: '#15323d' },
  dateButton: { minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: '#d9e3e8', backgroundColor: '#fff', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dateText: { flex: 1, color: '#15323d', fontWeight: '700' },
  placeholderText: { color: '#8ba0a8' },
  upload: { minHeight: 54, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#fff8ed', borderWidth: 1, borderColor: '#ffd8a6' },
  uploadIcon: { width: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff981f' },
  uploadBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 12 },
  uploadLabel: { fontWeight: '800', color: '#8a4b00' },
  uploadText: { color: '#9a6a2c', marginTop: 2 },
  backButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  backText: { color: '#0073b7', fontWeight: '800' },
});
