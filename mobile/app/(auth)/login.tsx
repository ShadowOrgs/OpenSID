import { login } from '@/api/auth';
import { API_URL, ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [nik, setNik] = useState('3211220803910013');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');

    try {
      const response = await login({ nik, password, device_name: 'Expo Mobile' });
      await signIn(response.data);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Login gagal: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>OpenSID Mandiri</Text>
      <Text style={styles.title}>Masuk Layanan Mandiri</Text>

      <TextInput style={styles.input} placeholder="NIK" keyboardType="number-pad" maxLength={16} value={nik} onChangeText={setNik} />
      <TextInput style={styles.input} placeholder="PIN" keyboardType="number-pad" maxLength={6} secureTextEntry value={password} onChangeText={setPassword} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.apiUrl}>API: {API_URL}</Text>

      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Masuk</Text>}
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.secondaryText}>Daftar akun baru</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#eef4f7' },
  brand: { fontSize: 16, fontWeight: '700', color: '#0088a8', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#15323d', marginBottom: 24 },
  input: { height: 48, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d9e3e8' },
  error: { color: '#c62828', marginBottom: 12 },
  apiUrl: { color: '#607d89', fontSize: 12, marginBottom: 12 },
  button: { height: 48, borderRadius: 8, backgroundColor: '#009966', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { marginTop: 14, alignItems: 'center' },
  secondaryText: { color: '#0088a8', fontWeight: '700' },
});
