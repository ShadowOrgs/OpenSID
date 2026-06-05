import { dashboard } from '@/api/dashboard';
import { useAuth } from '@/auth/AuthProvider';
import type { DashboardResponse } from '@/types/mandiri';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: dashboard });
  const menus = data?.data.menus ?? [];

  function openMenu(key: string) {
    const routes: Record<string, string> = {
      surat: '/surat',
      pesan: '/pesan',
      profil: '/profil',
      lapak: '/lapak',
      artikel: '/artikel',
      galeri: '/galeri',
      agenda: '/agenda',
      informasi_publik: '/informasi-publik',
      pengaduan: '/pengaduan',
      kepuasan: '/kepuasan',
      info_desa: '/info-desa',
      sinergi_program: '/sinergi-program',
      bantuan: '/bantuan',
      perangkat: '/perangkat',
      dokumen: '/dokumen',
      biodata: '/biodata',
      kartu_keluarga: '/kartu-keluarga',
      ganti_pin: '/ganti-pin',
    };

    const route = routes[key];

    if (route) {
      router.push(route as never);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.village}>{data?.data.desa.nama ?? 'Desa'}</Text>
      <Text style={styles.name}>{user?.nama}</Text>

      <View style={styles.grid}>
        {menus.map((menu: DashboardResponse['menus'][number]) => (
          <Pressable key={menu.key} style={styles.card} onPress={() => openMenu(menu.key)}>
            <Ionicons name={iconName(menu.icon)} size={28} color="#fff" />
            <Text style={styles.cardText}>{menu.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Akses Cepat</Text>
      {data?.data.quick_links.map((item: DashboardResponse['quick_links'][number]) => (
        <Pressable key={item.key} style={styles.row} onPress={() => openMenu(item.key)}>
          <Text style={styles.rowText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={20} color="#55727e" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function iconName(name: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    'file-text': 'document-text',
    mail: 'mail',
    'shopping-cart': 'cart',
    newspaper: 'newspaper',
    images: 'images',
    calendar: 'calendar',
    megaphone: 'megaphone',
    'chat-alert': 'chatbubble-ellipses',
    happy: 'happy',
    'map-pin': 'location',
    link: 'link',
    'heart-handshake': 'heart',
    users: 'people',
    folder: 'folder',
  };

  return map[name] ?? 'apps';
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 16, paddingBottom: 32 },
  village: { color: '#0088a8', fontWeight: '800', fontSize: 16 },
  name: { color: '#15323d', fontWeight: '800', fontSize: 24, marginTop: 4, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', minHeight: 88, borderRadius: 8, backgroundColor: '#00a86b', padding: 14, justifyContent: 'space-between' },
  cardText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  sectionTitle: { marginTop: 24, marginBottom: 10, fontSize: 16, fontWeight: '800', color: '#15323d' },
  row: { height: 50, borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { fontWeight: '700', color: '#31515e' },
});
