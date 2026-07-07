import { getMobileHealth, login, type MobileHealth } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { AppButton } from '@/components/AppButton';
import { AppDialog } from '@/components/AppDialog';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const { signIn, changeVillage, selectedVillage } = useAuth();
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [health, setHealth] = useState<MobileHealth | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant: 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMobileHealth()
      .then((response) => setHealth(response.data))
      .catch(() => undefined);
  }, []);

  async function submit() {
    setLoading(true);

    try {
      const response = await login({ nik, password, device_name: 'Expo Mobile' });
      await signIn(response.data);
      router.replace('/(tabs)');
    } catch (err) {
      setDialog({ title: 'Gagal', message: err instanceof ApiError ? err.message : `Login gagal: ${String(err)}`, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeVillage() {
    await changeVillage();
    router.replace('/(auth)/pilih-desa');
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <View style={styles.logoFrame}>
          {health?.desa.logo_url ? <Image source={{ uri: health.desa.logo_url }} style={styles.logo} /> : <Ionicons name="business" size={34} color="#0073b7" />}
        </View>
        <Text style={styles.brand}>{health?.desa.nama ?? selectedVillage?.nama ?? 'OpenSID Mandiri'}</Text>
        <Text style={styles.subtitle}>{[health?.desa.kecamatan, health?.desa.kabupaten].filter(Boolean).join(', ') || 'Layanan Mandiri Desa'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Masuk Layanan Mandiri</Text>
        <TextInput style={styles.input} placeholder="NIK" keyboardType="number-pad" maxLength={16} value={nik} onChangeText={setNik} />
        <TextInput style={styles.input} placeholder="PIN" keyboardType="number-pad" maxLength={6} secureTextEntry value={password} onChangeText={setPassword} />


        <AppButton label="Masuk" icon="log-in" onPress={submit} loading={loading} />

        <Pressable style={styles.registerButton} onPress={() => router.push('/(auth)/register')}>
          <Ionicons name="person-add" size={19} color="#0073b7" />
          <Text style={styles.registerText}>Daftar Akun Baru</Text>
        </Pressable>

        <Pressable style={styles.changeVillageButton} onPress={handleChangeVillage}>
          <Ionicons name="swap-horizontal" size={19} color="#e08e0b" />
          <Text style={styles.changeVillageText}>Ganti Desa</Text>
        </Pressable>
      </View>
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        variant={dialog?.variant}
        onClose={() => setDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#ecf0f5' },
  brandBlock: { alignItems: 'center', marginBottom: 22 },
  logoFrame: {
    width: 82,
    height: 82,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dce8ee',
    marginBottom: 12,
  },
  logo: { width: 62, height: 62, resizeMode: 'contain' },
  brand: { fontSize: 21, fontWeight: '900', color: '#15323d', textAlign: 'center' },
  subtitle: { color: '#607d89', fontWeight: '700', marginTop: 4, textAlign: 'center' },
  card: { borderRadius: 8, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#dce8ee' },
  title: { fontSize: 20, fontWeight: '800', color: '#15323d', marginBottom: 16 },
  input: { height: 48, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d9e3e8' },
  apiUrl: { color: '#607d89', fontSize: 12, marginBottom: 12 },
  registerButton: {
    minHeight: 46,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0073b7',
    backgroundColor: '#f5fbff',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerText: { color: '#0073b7', fontWeight: '800' },
  changeVillageButton: {
    minHeight: 46,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e08e0b',
    backgroundColor: '#fffdf5',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  changeVillageText: { color: '#e08e0b', fontWeight: '800' },
});
