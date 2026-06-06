import { logout } from '@/api/auth';
import { useAuth } from '@/auth/AuthProvider';
import { AppButton } from '@/components/AppButton';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfilScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      return;
    }

    setMessage(null);
    refreshUser().catch((error) => setMessage(error instanceof Error ? error.message : 'Profil gagal dimuat.'));
  });

  async function handleLogout() {
    await logout().catch(() => undefined);
    await signOut();
    router.replace('/(auth)/login');
  }

  async function onRefresh() {
    setRefreshing(true);
    setMessage(null);
    try {
      await refreshUser();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Profil gagal dimuat.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {message ? <Text style={styles.notice}>{message}</Text> : null}

      <View style={styles.profileCard}>
        <View style={styles.avatarFrame}>
          {user?.foto_url ? <Image source={{ uri: user.foto_url }} style={styles.avatar} /> : <Ionicons name="person" size={48} color="#0073b7" />}
        </View>
        <View style={styles.profileText}>
          <Text style={styles.title}>{user?.nama ?? '-'}</Text>
          <Text style={styles.subtitle}>Akun Layanan Mandiri</Text>
        </View>
      </View>

      <View style={styles.section}>
        <InfoRow icon="card" label="NIK" value={user?.nik} />
        <InfoRow icon="people" label="No. KK" value={user?.no_kk} />
        <InfoRow icon="mail" label="Email" value={user?.email} />
        <InfoRow icon="call" label="Telegram" value={user?.telegram} />
        <InfoRow icon="location" label="Alamat" value={user?.alamat} />
        <InfoRow icon="calendar" label="Tanggal Lahir" value={user?.tanggal_lahir} />
      </View>

      <AppButton label="Keluar" icon="log-out" onPress={handleLogout} style={styles.logout} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | null | undefined }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#0073b7" />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecf0f5' },
  content: { padding: 18, gap: 14 },
  notice: { borderRadius: 8, backgroundColor: '#fdecec', color: '#b42318', padding: 12, fontWeight: '700', marginBottom: 12 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 8, backgroundColor: '#fff', padding: 16, borderWidth: 1, borderColor: '#dce8ee' },
  avatarFrame: { width: 82, height: 82, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5fbff', borderWidth: 1, borderColor: '#dce8ee', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  profileText: { flex: 1 },
  title: { color: '#15323d', fontSize: 22, fontWeight: '900' },
  subtitle: { color: '#607d89', fontWeight: '700', marginTop: 5 },
  section: { borderRadius: 8, backgroundColor: '#fff', padding: 6, borderWidth: 1, borderColor: '#dce8ee' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderBottomWidth: 1, borderBottomColor: '#edf2f5' },
  infoIcon: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f4fb' },
  infoBody: { flex: 1, gap: 2 },
  infoLabel: { color: '#7a929c', fontSize: 12, fontWeight: '800' },
  infoValue: { color: '#15323d', fontSize: 15, fontWeight: '700' },
  logout: { marginTop: 2 },
});
