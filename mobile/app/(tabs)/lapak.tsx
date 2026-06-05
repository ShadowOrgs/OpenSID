import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getLapak, type LapakCategory, type LapakProduct } from '@/api/services';

export default function LapakScreen() {
  const [items, setItems] = useState<LapakProduct[]>([]);
  const [categories, setCategories] = useState<LapakCategory[]>([]);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function load(nextCategoryId = categoryId) {
    setLoading(true);
    setMessage(null);
    try {
      const response = await getLapak({ keyword, category_id: nextCategoryId });
      setItems(response.data.items);
      setCategories(response.data.categories);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Data lapak gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function selectCategory(id: number | undefined) {
    setCategoryId(id);
    load(id);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Lapak</Text>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      <View style={styles.searchRow}>
        <TextInput value={keyword} onChangeText={setKeyword} placeholder="Cari produk" style={styles.input} placeholderTextColor="#8ba0a8" />
        <Pressable style={styles.searchButton} onPress={() => load()}>
          <Text style={styles.searchButtonText}>Cari</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <Pressable style={[styles.chip, !categoryId && styles.chipActive]} onPress={() => selectCategory(undefined)}>
          <Text style={[styles.chipText, !categoryId && styles.chipTextActive]}>Semua</Text>
        </Pressable>
        {categories.map((item) => (
          <Pressable key={item.id} style={[styles.chip, categoryId === item.id && styles.chipActive]} onPress={() => selectCategory(item.id)}>
            <Text style={[styles.chipText, categoryId === item.id && styles.chipTextActive]}>{item.nama}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? (
        <ActivityIndicator color="#0088a8" />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Belum ada produk.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            {item.foto_url ? <Image source={{ uri: item.foto_url }} style={styles.photo} /> : <View style={styles.photoPlaceholder} />}
            <View style={styles.info}>
              <Text style={styles.name}>{item.nama}</Text>
              <Text style={styles.price}>{rupiah(item.harga_diskon || item.harga)} / {item.satuan ?? 'unit'}</Text>
              <Text style={styles.meta}>{item.kategori ?? '-'} oleh {item.pelapak}</Text>
              {item.deskripsi ? <Text style={styles.description}>{item.deskripsi}</Text> : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  notice: { borderRadius: 8, backgroundColor: '#fdecec', color: '#b42318', padding: 12, fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#c7d6dd', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fff', color: '#15323d' },
  searchButton: { minWidth: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#0088a8' },
  searchButtonText: { color: '#fff', fontWeight: '800' },
  categories: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: '#c7d6dd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fff' },
  chipActive: { borderColor: '#0088a8', backgroundColor: '#e5f7fb' },
  chipText: { color: '#415d68', fontWeight: '700' },
  chipTextActive: { color: '#006f86' },
  empty: { color: '#55727e' },
  card: { flexDirection: 'row', gap: 12, borderRadius: 8, backgroundColor: '#fff', padding: 12 },
  photo: { width: 82, height: 82, borderRadius: 8, backgroundColor: '#dce8ee' },
  photoPlaceholder: { width: 82, height: 82, borderRadius: 8, backgroundColor: '#dce8ee' },
  info: { flex: 1, gap: 4 },
  name: { color: '#15323d', fontWeight: '800', fontSize: 16 },
  price: { color: '#00945f', fontWeight: '800' },
  meta: { color: '#7a929c' },
  description: { color: '#415d68' },
});
