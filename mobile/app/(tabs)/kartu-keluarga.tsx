import { useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getFamily, getPrintUrl, type FamilyMember } from '@/api/services';
import { AppButton } from '@/components/AppButton';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

type Family = Awaited<ReturnType<typeof getFamily>>['data']['keluarga'];

export default function KartuKeluargaScreen() {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const response = await getFamily();
    setFamily(response.data.keluarga);
  }

  useRefreshOnFocus(async (isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setMessage(null);
    try {
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Data KK gagal dimuat.');
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
      setMessage(error instanceof Error ? error.message : 'Data KK gagal dimuat.');
    } finally {
      setRefreshing(false);
    }
  }

  async function openPdf() {
    const url = await getPrintUrl('kk');
    await Linking.openURL(url);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Kartu Keluarga</Text>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      <AppButton label="Cetak Salinan KK PDF" icon="print" onPress={openPdf} />
      {loading ? (
        <ActivityIndicator color="#0088a8" />
      ) : family ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{family.no_kk ?? '-'}</Text>
            <Text style={styles.text}>{family.alamat ?? '-'}</Text>
            <Text style={styles.meta}>RT {family.rt ?? '-'} / RW {family.rw ?? '-'} {family.dusun ?? ''}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Anggota</Text>
            {family.anggota.map((item: FamilyMember) => (
              <View key={item.id} style={styles.member}>
                <Text style={styles.name}>{item.nama}</Text>
                <Text style={styles.text}>{item.nik}</Text>
                <Text style={styles.meta}>{item.tempat_lahir ?? '-'}, {item.tanggal_lahir ?? '-'}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.empty}>Data KK tidak tersedia.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  notice: { borderRadius: 8, backgroundColor: '#fdecec', color: '#b42318', padding: 12, fontWeight: '700' },
  section: { gap: 8, borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  sectionTitle: { color: '#15323d', fontSize: 16, fontWeight: '800' },
  member: { gap: 4, borderTopWidth: 1, borderTopColor: '#e2eaee', paddingTop: 10 },
  name: { color: '#15323d', fontWeight: '800' },
  text: { color: '#415d68' },
  meta: { color: '#7a929c' },
  empty: { color: '#55727e' },
});
