import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPrintUrl, getProfile, type Biodata } from '@/api/services';

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
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((response) => setData(response.data.biodata))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Biodata gagal dimuat.'))
      .finally(() => setLoading(false));
  }, []);

  async function openPdf() {
    const url = await getPrintUrl('biodata');
    await Linking.openURL(url);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Biodata</Text>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      <Pressable style={styles.printButton} onPress={openPdf}>
        <Text style={styles.printButtonText}>Cetak PDF</Text>
      </Pressable>
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
  printButton: { alignItems: 'center', borderRadius: 8, backgroundColor: '#0088a8', paddingVertical: 13 },
  printButtonText: { color: '#fff', fontWeight: '800' },
  section: { borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  row: { gap: 4, borderBottomWidth: 1, borderBottomColor: '#e2eaee', paddingVertical: 10 },
  label: { color: '#7a929c', fontWeight: '700' },
  value: { color: '#15323d', fontWeight: '700' },
  empty: { color: '#55727e' },
});
