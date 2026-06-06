import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getAssistance, type Assistance } from '@/api/services';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

export default function BantuanScreen() {
  const [items, setItems] = useState<Assistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const response = await getAssistance();
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
      setMessage(error instanceof Error ? error.message : 'Data bantuan gagal dimuat.');
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
      setMessage(error instanceof Error ? error.message : 'Data bantuan gagal dimuat.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Bantuan</Text>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      {loading ? (
        <ActivityIndicator color="#0088a8" />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Belum ada bantuan untuk akun ini.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.name}>{item.nama ?? 'Program Bantuan'}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.text}>{item.keterangan ?? '-'}</Text>
            <Text style={styles.meta}>{item.tanggal_mulai ?? '-'} - {item.tanggal_selesai ?? '-'}</Text>
            {item.no_kartu ? <Text style={styles.meta}>No kartu: {item.no_kartu}</Text> : null}
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
  card: { gap: 8, borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, color: '#15323d', fontWeight: '800', fontSize: 16 },
  status: { color: '#006f86', fontWeight: '800' },
  text: { color: '#415d68' },
  meta: { color: '#7a929c' },
});
