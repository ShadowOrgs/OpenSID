import { logout } from '@/api/auth';
import { useAuth } from '@/auth/AuthProvider';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ProfilScreen() {
  const { user, signOut } = useAuth();

  async function handleLogout() {
    await logout().catch(() => undefined);
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.nama}</Text>
      <Text style={styles.item}>NIK: {user?.nik}</Text>
      <Text style={styles.item}>No KK: {user?.no_kk ?? '-'}</Text>
      <Text style={styles.item}>Email: {user?.email ?? '-'}</Text>
      <Text style={styles.item}>Alamat: {user?.alamat ?? '-'}</Text>

      <Pressable style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Keluar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#eef4f7' },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d', marginBottom: 14 },
  item: { color: '#31515e', marginBottom: 8 },
  logout: { height: 46, borderRadius: 8, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  logoutText: { color: '#fff', fontWeight: '800' },
});
