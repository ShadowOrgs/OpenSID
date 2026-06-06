import { useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPrintUrl, getProfile, type Biodata } from '@/api/services';
import { AppButton } from '@/components/AppButton';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

const LABELS: Record<string, string> = {
  nama: 'Nama',
  nik: 'NIK',
  no_kk: 'No. KK',
  tempat_lahir: 'Tempat Lahir',
  tanggal_lahir: 'Tanggal Lahir',
  jenis_kelamin: 'Jenis Kelamin',
  alamat: 'Alamat',
  ayah_nik: 'NIK Ayah',
  nama_ayah: 'Nama Ayah',
  ibu_nik: 'NIK Ibu',
  nama_ibu: 'Nama Ibu',
  dokumen_paspor: 'Paspor',
  dokumen_kitas: 'KITAS',
  email: 'Email',
  telepon: 'Telepon',
};

export default function BiodataScreen() {
  const [data, setData] = useState<Biodata | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const response = await getProfile();
    setData(response.data.biodata);
  }

  useRefreshOnFocus(async (isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setMessage(null);
    try {
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Biodata gagal dimuat.');
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
      setMessage(error instanceof Error ? error.message : 'Biodata gagal dimuat.');
    } finally {
      setRefreshing(false);
    }
  }

  async function openPdf() {
    const url = await getPrintUrl('biodata');
    await Linking.openURL(url);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Biodata</Text>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      <AppButton label="Cetak PDF" icon="print" onPress={openPdf} />
      <View style={styles.section}>
        {loading ? (
          <ActivityIndicator color="#0088a8" />
        ) : data ? (
          Object.entries(LABELS).map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{String(data[key] ?? '-')}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Biodata tidak tersedia.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  notice: { borderRadius: 8, backgroundColor: '#fdecec', color: '#b42318', padding: 12, fontWeight: '700' },
  section: { borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  row: { gap: 4, borderBottomWidth: 1, borderBottomColor: '#e2eaee', paddingVertical: 10 },
  label: { color: '#7a929c', fontWeight: '700' },
  value: { color: '#15323d', fontWeight: '700' },
  empty: { color: '#55727e' },
});
