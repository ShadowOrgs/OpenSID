import { useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPerangkat, type Perangkat } from '@/api/services';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

export default function PerangkatScreen() {
  const [items, setItems] = useState<Perangkat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const response = await getPerangkat();
    setItems(response.data.items);
  }

  useRefreshOnFocus(async (isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setMessage(null);
    try {
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Data perangkat gagal dimuat.');
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  });

  async function onRefresh() {
    setRefreshing(true);
    setMessage(null);
    try {
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Data perangkat gagal dimuat.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Perangkat Desa</Text>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      {loading ? (
        <ActivityIndicator color="#0088a8" />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Belum ada data perangkat.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            {item.foto_url ? <Image source={{ uri: item.foto_url }} style={styles.avatar} /> : <View style={styles.avatarPlaceholder} />}
            <View style={styles.info}>
              <Text style={styles.name}>{item.nama}</Text>
              <Text style={styles.role}>{item.jabatan ?? '-'}</Text>
              <Text style={styles.meta}>{item.nip || item.niap || '-'}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  notice: { borderRadius: 8, backgroundColor: '#fdecec', color: '#b42318', padding: 12, fontWeight: '700' },
  empty: { color: '#55727e' },
  card: { flexDirection: 'row', gap: 12, borderRadius: 8, backgroundColor: '#fff', padding: 12 },
  avatar: { width: 58, height: 58, borderRadius: 8, backgroundColor: '#dce8ee' },
  avatarPlaceholder: { width: 58, height: 58, borderRadius: 8, backgroundColor: '#dce8ee' },
  info: { flex: 1, justifyContent: 'center' },
  name: { color: '#15323d', fontWeight: '800', fontSize: 16 },
  role: { color: '#0088a8', fontWeight: '700', marginTop: 2 },
  meta: { color: '#7a929c', marginTop: 4 },
});
