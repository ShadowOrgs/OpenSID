import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0073b7' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#0073b7',
        tabBarInactiveTintColor: '#6b7f87',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="surat" options={{ title: 'Surat', tabBarIcon: ({ color, size }) => <Ionicons name="document-text" color={color} size={size} /> }} />
      <Tabs.Screen name="pesan" options={{ title: 'Pesan', tabBarIcon: ({ color, size }) => <Ionicons name="mail" color={color} size={size} /> }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
      <Tabs.Screen name="lapak" options={{ title: 'Lapak', href: null }} />
      <Tabs.Screen name="artikel" options={{ title: 'Artikel', href: null }} />
      <Tabs.Screen name="galeri" options={{ title: 'Galeri', href: null }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', href: null }} />
      <Tabs.Screen name="informasi-publik" options={{ title: 'Informasi Publik', href: null }} />
      <Tabs.Screen name="pengaduan" options={{ title: 'Pengaduan', href: null }} />
      <Tabs.Screen name="kepuasan" options={{ title: 'Kepuasan Layanan', href: null }} />
      <Tabs.Screen name="info-desa" options={{ title: 'Info Desa', href: null }} />
      <Tabs.Screen name="sinergi-program" options={{ title: 'Sinergi Program', href: null }} />
      <Tabs.Screen name="bantuan" options={{ title: 'Bantuan', href: null }} />
      <Tabs.Screen name="perangkat" options={{ title: 'Perangkat', href: null }} />
      <Tabs.Screen name="dokumen" options={{ title: 'Dokumen', href: null }} />
      <Tabs.Screen name="biodata" options={{ title: 'Biodata', href: null }} />
      <Tabs.Screen name="kartu-keluarga" options={{ title: 'Kartu Keluarga', href: null }} />
      <Tabs.Screen name="ganti-pin" options={{ title: 'Ganti PIN', href: null }} />
    </Tabs>
  );
}
