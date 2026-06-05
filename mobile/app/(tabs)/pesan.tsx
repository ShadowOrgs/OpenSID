import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/api/client';
import { getMessageDetail, getMessages, sendMessage, type MandiriMessage, type MessageBox } from '@/api/pesan';

export default function PesanScreen() {
  const [box, setBox] = useState<MessageBox>('masuk');
  const [messages, setMessages] = useState<MandiriMessage[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MandiriMessage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMessages = useCallback(async (targetBox: MessageBox = box) => {
    const response = await getMessages(targetBox);
    setMessages(response.data.items);
  }, [box]);

  useEffect(() => {
    setLoading(true);
    setNotice(null);
    loadMessages(box)
      .catch((error) => setNotice(error instanceof Error ? error.message : 'Pesan gagal dimuat.'))
      .finally(() => setLoading(false));
  }, [box, loadMessages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNotice(null);
    try {
      await loadMessages();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Pesan gagal dimuat.');
    } finally {
      setRefreshing(false);
    }
  }, [loadMessages]);

  async function submit() {
    setSubmitting(true);
    setNotice(null);

    try {
      await sendMessage({ subjek: subject.trim(), pesan: body.trim() });
      setSubject('');
      setBody('');
      setBox('keluar');
      await loadMessages('keluar');
      setNotice('Pesan berhasil dikirim.');
    } catch (error) {
      if (error instanceof ApiError) {
        const firstError = Object.values(error.errors).flat()[0];
        setNotice(firstError ?? error.message);
      } else {
        setNotice(error instanceof Error ? error.message : 'Pesan gagal dikirim.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(item: MandiriMessage) {
    setSelectedMessage(item);
    setDetailLoading(true);
    setNotice(null);

    try {
      const response = await getMessageDetail(item.uuid);
      setSelectedMessage(response.data.item);
      setMessages((current) =>
        current.map((message) => (message.uuid === item.uuid ? { ...message, is_read: response.data.item.is_read, status: response.data.item.status } : message))
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Detail pesan gagal dimuat.');
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Pesan</Text>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tulis Pesan</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Subjek"
          style={styles.input}
          placeholderTextColor="#8ba0a8"
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Isi pesan"
          multiline
          style={[styles.input, styles.textArea]}
          placeholderTextColor="#8ba0a8"
        />
        <Pressable style={[styles.primaryButton, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Mengirim...' : 'Kirim Pesan'}</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, box === 'masuk' && styles.tabActive]} onPress={() => setBox('masuk')}>
          <Text style={[styles.tabText, box === 'masuk' && styles.tabTextActive]}>Masuk</Text>
        </Pressable>
        <Pressable style={[styles.tab, box === 'keluar' && styles.tabActive]} onPress={() => setBox('keluar')}>
          <Text style={[styles.tabText, box === 'keluar' && styles.tabTextActive]}>Keluar</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{box === 'masuk' ? 'Pesan Masuk' : 'Pesan Keluar'}</Text>
        {loading ? (
          <ActivityIndicator color="#008aa6" />
        ) : messages.length === 0 ? (
          <Text style={styles.empty}>Belum ada pesan.</Text>
        ) : (
          messages.map((item) => (
            <Pressable key={item.uuid} style={styles.messageItem} onPress={() => openDetail(item)}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageTitle}>{item.subjek || 'Tanpa subjek'}</Text>
                {!item.is_read && box === 'masuk' ? <Text style={styles.unread}>Baru</Text> : null}
              </View>
              <Text style={styles.messagePreview} numberOfLines={2}>{item.pesan}</Text>
              <Text style={styles.messageMeta}>{formatDate(item.tgl_upload ?? item.created_at)}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Modal visible={selectedMessage !== null} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selectedMessage ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedMessage.subjek || 'Tanpa subjek'}</Text>
                  <Pressable style={styles.closeButton} onPress={() => setSelectedMessage(null)}>
                    <Text style={styles.closeButtonText}>Tutup</Text>
                  </Pressable>
                </View>
                <Text style={styles.messageMeta}>{formatDate(selectedMessage.tgl_upload ?? selectedMessage.created_at)}</Text>
                {detailLoading ? (
                  <ActivityIndicator color="#008aa6" />
                ) : (
                  <ScrollView style={styles.detailBody}>
                    <Text style={styles.detailText}>{selectedMessage.pesan}</Text>
                  </ScrollView>
                )}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  notice: {
    borderRadius: 8,
    backgroundColor: '#e7f7f4',
    color: '#006b63',
    padding: 12,
    fontWeight: '700',
  },
  section: { gap: 10, borderRadius: 8, backgroundColor: '#ffffff', padding: 14 },
  sectionTitle: { color: '#15323d', fontSize: 16, fontWeight: '800' },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#c7d6dd',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#15323d',
    backgroundColor: '#ffffff',
  },
  textArea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  primaryButton: { alignItems: 'center', borderRadius: 8, backgroundColor: '#00945f', paddingVertical: 13 },
  buttonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, alignItems: 'center', borderRadius: 8, backgroundColor: '#dce8ee', paddingVertical: 11 },
  tabActive: { backgroundColor: '#008aa6' },
  tabText: { color: '#415d68', fontWeight: '800' },
  tabTextActive: { color: '#ffffff' },
  empty: { color: '#55727e' },
  messageItem: { gap: 8, borderTopWidth: 1, borderTopColor: '#e2eaee', paddingTop: 12 },
  messageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  messageTitle: { flex: 1, color: '#15323d', fontWeight: '800' },
  messagePreview: { color: '#415d68', lineHeight: 20 },
  messageMeta: { color: '#7a929c', fontSize: 12 },
  unread: { borderRadius: 6, backgroundColor: '#e5f7fb', color: '#006f86', paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 50, 61, 0.35)' },
  modalSheet: { maxHeight: '78%', gap: 10, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#ffffff', padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  modalTitle: { flex: 1, color: '#15323d', fontSize: 18, fontWeight: '800' },
  closeButton: { borderRadius: 8, backgroundColor: '#eef4f7', paddingHorizontal: 12, paddingVertical: 8 },
  closeButtonText: { color: '#31515e', fontWeight: '800' },
  detailBody: { maxHeight: 420 },
  detailText: { color: '#31515e', fontSize: 15, lineHeight: 22 },
});
