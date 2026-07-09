import { getApiUrl } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { type Village } from '@/auth/villageStorage';
import { AppButton } from '@/components/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const REGISTRY_URL = 'https://is3.cloudhost.id/public-files/desa/daftar-desa.json';

export default function PilihDesaScreen() {
  const { selectVillage } = useAuth();
  const [villages, setVillages] = useState<Village[]>([]);
  const [filteredVillages, setFilteredVillages] = useState<Village[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchVillages(urlToFetch: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(urlToFetch);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setVillages(data);
        setFilteredVillages(data);
      } else {
        throw new Error('Format data JSON tidak valid (harus array)');
      }
    } catch (err) {
      setError(
        `Gagal memuat daftar desa dari:\n${urlToFetch}\n\nDetail: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVillages(REGISTRY_URL);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVillages(villages);
    } else {
      const filtered = villages.filter((v) =>
        v.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVillages(filtered);
    }
  }, [searchQuery, villages]);

  async function handleSelect(village: Village) {
    await selectVillage(village);
    router.replace('/(auth)/login');
  }



  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.logoFrame}>
          <Image source={require('../../assets/logo-desa.png')} style={styles.logoImage} />
        </View>
        <Text style={styles.title}>Layanan Mandiri Warga</Text>
        <Text style={styles.subtitle}>
          Pilih desa Anda terlebih dahulu untuk memulai masuk ke sistem layanan mandiri.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.searchSection}>
          <Ionicons name="search" size={20} color="#90a4ae" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama desa..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0073b7" />
            <Text style={styles.loadingText}>Memuat daftar desa...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={32} color="#dd4b39" />
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorActions}>
              <AppButton
                label="Coba Lagi"
                icon="refresh"
                onPress={() => fetchVillages(REGISTRY_URL)}
              />

            </View>
          </View>
        )}

        {!loading && !error && filteredVillages.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={32} color="#90a4ae" />
            <Text style={styles.emptyText}>Desa tidak ditemukan.</Text>
          </View>
        )}

        {!loading && !error && filteredVillages.length > 0 && (
          <FlatList
            data={filteredVillages}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable style={styles.item} onPress={() => handleSelect(item)}>
                <View style={styles.itemInfo}>
                  <Image source={require('../../assets/logo-desa.png')} style={styles.itemLogoImage} />
                  <Text style={styles.itemName}>{item.nama}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cfd8dc" />
              </Pressable>
            )}
          />
        )}
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#ecf0f5' },
  headerBlock: { alignItems: 'center', marginBottom: 20 },
  logoFrame: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dce8ee',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoImage: { width: 52, height: 52, resizeMode: 'contain' },
  itemLogoImage: { width: 22, height: 22, resizeMode: 'contain' },
  title: { fontSize: 22, fontWeight: '900', color: '#15323d', textAlign: 'center' },
  subtitle: {
    color: '#607d89',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    flex: 1,
    maxHeight: '60%',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce8ee',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e3e8',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#15323d' },
  list: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f7',
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#15323d', flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#607d89', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: '#90a4ae', fontWeight: '600' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  errorText: {
    color: '#dd4b39',
    textAlign: 'center',
    fontSize: 13,
    marginVertical: 12,
    lineHeight: 18,
  },
  errorActions: { width: '100%', gap: 10 },

});
