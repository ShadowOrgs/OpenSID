import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getDocuments, uploadDocument, type MandiriDocument } from '@/api/documents';
import { AppButton } from '@/components/AppButton';
import { AppDialog } from '@/components/AppDialog';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

export default function DokumenScreen() {
  const [items, setItems] = useState<MandiriDocument[]>([]);
  const [name, setName] = useState('');
  const [syaratId, setSyaratId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    const response = await getDocuments();
    setItems(response.data.items);
  }, []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setMessage(null);
    loadData()
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Dokumen gagal dimuat.'))
      .finally(() => {
        if (isInitial) {
          setLoading(false);
        }
      });
  });

  async function refresh() {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  async function pickAndUpload() {
    setUploading(true);
    setMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const data = new FormData();
      data.append('nama', name.trim() || asset.name);
      data.append('id_syarat', syaratId.trim());
      data.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
      } as unknown as Blob);

      await uploadDocument(data);
      setName('');
      setSyaratId('');
      await loadData();
      setDialog({ title: 'Berhasil', message: 'Dokumen berhasil diunggah.', variant: 'success' });
    } catch (error) {
      if (error instanceof ApiError) {
        setDialog({ title: 'Gagal', message: Object.values(error.errors).flat()[0] ?? error.message, variant: 'error' });
      } else {
        setDialog({ title: 'Gagal', message: error instanceof Error ? error.message : 'Dokumen gagal diunggah.', variant: 'error' });
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Dokumen</Text>
      {message ? <Text style={styles.notice}>{message}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unggah Dokumen</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Nama dokumen" style={styles.input} placeholderTextColor="#8ba0a8" />
        <TextInput
          value={syaratId}
          onChangeText={setSyaratId}
          placeholder="ID jenis syarat"
          keyboardType="number-pad"
          style={styles.input}
          placeholderTextColor="#8ba0a8"
        />
        <AppButton label={uploading ? 'Mengunggah...' : 'Pilih File'} icon="cloud-upload" onPress={pickAndUpload} loading={uploading} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daftar Dokumen</Text>
        {loading ? (
          <ActivityIndicator color="#0088a8" />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Belum ada dokumen.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.nama}</Text>
              <Text style={styles.itemText}>{item.nama_syarat ?? 'Tanpa jenis syarat'}</Text>
              <Text style={styles.itemMeta}>{item.file_name ?? '-'}</Text>
              {item.file_url ? (
                <AppButton label="Lihat Dokumen" icon="eye" compact onPress={() => Linking.openURL(item.file_url!)} />
              ) : null}
            </View>
          ))
        )}
      </View>
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        variant={dialog?.variant}
        onClose={() => setDialog(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  notice: { borderRadius: 8, backgroundColor: '#e7f7f4', color: '#006b63', padding: 12, fontWeight: '700' },
  section: { gap: 10, borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  sectionTitle: { color: '#15323d', fontSize: 16, fontWeight: '800' },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#c7d6dd', borderRadius: 8, paddingHorizontal: 12, color: '#15323d' },
  empty: { color: '#55727e' },
  item: { gap: 5, borderTopWidth: 1, borderTopColor: '#e2eaee', paddingTop: 12 },
  itemTitle: { color: '#15323d', fontWeight: '800' },
  itemText: { color: '#415d68' },
  itemMeta: { color: '#7a929c', fontSize: 12 },
});
