import { useCallback, useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
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
import { getDocuments, uploadDocument, type MandiriDocument } from '@/api/documents';
import { AppButton } from '@/components/AppButton';
import { AppDialog } from '@/components/AppDialog';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { Ionicons } from '@expo/vector-icons';
import {
  createSuratRequest,
  getSuratRequest,
  getSuratRequests,
  getSuratType,
  getSuratTypes,
  type SuratField,
  type SuratRequest,
  type SuratType,
} from '@/api/surat';

export default function SuratScreen() {
  const [types, setTypes] = useState<SuratType[]>([]);
  const [requests, setRequests] = useState<SuratRequest[]>([]);
  const [documents, setDocuments] = useState<MandiriDocument[]>([]);
  const [detail, setDetail] = useState<SuratType | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [syaratValues, setSyaratValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SuratRequest | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant: 'success' | 'error' | 'warning' } | null>(null);

  const selectedType = useMemo(() => types.find((item) => item.id === selectedId) ?? null, [selectedId, types]);
  const activeType = detail ?? selectedType;

  const loadData = useCallback(async () => {
    const [typeResponse, requestResponse, documentResponse] = await Promise.all([getSuratTypes(), getSuratRequests(), getDocuments()]);
    setTypes(typeResponse.data.items);
    setRequests(requestResponse.data.items);
    setDocuments(documentResponse.data.items);
    setSelectedId((current) => current ?? typeResponse.data.items[0]?.id ?? null);
  }, []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setMessage(null);
    loadData()
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Data surat gagal dimuat.'))
      .finally(() => {
        if (isInitial) {
          setLoading(false);
        }
      });
  });

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    setMessage(null);
    getSuratType(selectedId)
      .then((response) => {
        setDetail(response.data.item);
        setFieldValues({});
        setSyaratValues({});
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Detail surat gagal dimuat.'));
  }, [selectedId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Data surat gagal dimuat.');
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  async function submit() {
    if (!selectedId) {
      setDialog({ title: 'Perhatian', message: 'Pilih jenis surat terlebih dahulu.', variant: 'warning' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await createSuratRequest({
        id_surat: selectedId,
        no_hp_aktif: phone.trim(),
        keterangan: note.trim(),
        isian_form: fieldValues,
        syarat: syaratValues,
      });
      setNote('');
      setFieldValues({});
      setSyaratValues({});
      await loadData();
      setDialog({ title: 'Berhasil', message: 'Permohonan surat berhasil dikirim.', variant: 'success' });
    } catch (error) {
      if (error instanceof ApiError) {
        const firstError = Object.values(error.errors).flat()[0];
        setDialog({ title: 'Gagal', message: firstError ?? error.message, variant: 'error' });
      } else {
        setDialog({ title: 'Gagal', message: error instanceof Error ? error.message : 'Permohonan surat gagal dikirim.', variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function pickAndUploadDocument(syaratId: number, syaratName: string) {
    setUploading(syaratId);
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
      data.append('nama', syaratName);
      data.append('id_syarat', String(syaratId));
      data.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
      } as unknown as Blob);

      const response = await uploadDocument(data);
      const documentResponse = await getDocuments();
      setDocuments(documentResponse.data.items);
      setSyaratValues((current) => ({ ...current, [String(syaratId)]: response.data.item.id }));
      setDialog({ title: 'Berhasil', message: 'Dokumen berhasil diunggah.', variant: 'success' });
    } catch (error) {
      if (error instanceof ApiError) {
        const firstError = Object.values(error.errors).flat()[0];
        setDialog({ title: 'Gagal', message: firstError ?? error.message, variant: 'error' });
      } else {
        setDialog({ title: 'Gagal', message: error instanceof Error ? error.message : 'Dokumen gagal diunggah.', variant: 'error' });
      }
    } finally {
      setUploading(null);
    }
  }

  async function openRequestDetail(item: SuratRequest) {
    setSelectedRequest(item);
    setRequestDetailLoading(true);
    setMessage(null);

    try {
      const response = await getSuratRequest(item.id);
      setSelectedRequest(response.data.item);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Detail permohonan surat gagal dimuat.');
    } finally {
      setRequestDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#008aa6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Surat</Text>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permohonan Baru</Text>
        <Text style={styles.label}>Jenis surat</Text>
        {types.length === 0 ? (
          <Text style={styles.empty}>Belum ada jenis surat yang diaktifkan untuk layanan mandiri.</Text>
        ) : (
          <SuratSelect
            value={selectedId}
            items={types}
            onChange={(id) => setSelectedId(id)}
          />
        )}

        {activeType?.fields.length ? (
          <View style={styles.dynamicFields}>
            {activeType.fields.map((field) => (
              <DynamicField
                key={field.name}
                field={field}
                value={fieldValues[field.name] ?? ''}
                onChange={(value) => setFieldValues((current) => ({ ...current, [field.name]: value }))}
              />
            ))}
          </View>
        ) : null}

        {activeType?.syarat.length ? (
          <View style={styles.requirements}>
            <Text style={styles.label}>Syarat</Text>
            {activeType.syarat.map((item) => (
              <View key={item.id} style={styles.requirementBlock}>
                <Text style={styles.requirementText}>{item.nama}</Text>
                {documents.filter((document) => document.id_syarat === item.id).map((document) => (
                  <Pressable
                    key={document.id}
                    style={[styles.documentOption, syaratValues[String(item.id)] === document.id && styles.documentOptionActive]}
                    onPress={() => setSyaratValues((current) => ({ ...current, [String(item.id)]: document.id }))}
                  >
                    <Text
                      style={[
                        styles.documentOptionText,
                        syaratValues[String(item.id)] === document.id && styles.documentOptionTextActive,
                      ]}
                    >
                      {document.nama}
                    </Text>
                  </Pressable>
                ))}
                <AppButton
                  label={uploading === item.id ? 'Mengunggah...' : 'Unggah Dokumen'}
                  icon="cloud-upload"
                  compact
                  onPress={() => pickAndUploadDocument(item.id, item.nama)}
                  loading={uploading === item.id}
                />
              </View>
            ))}
          </View>
        ) : null}

        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="No. HP aktif"
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor="#8ba0a8"
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Keterangan tambahan"
          multiline
          style={[styles.input, styles.textArea]}
          placeholderTextColor="#8ba0a8"
        />
        <AppButton
          label={submitting ? 'Mengirim...' : 'Kirim Permohonan'}
          icon="send"
          onPress={submit}
          loading={submitting}
          disabled={!types.length}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permohonan Aktif</Text>
        {requests.length === 0 ? (
          <Text style={styles.empty}>Belum ada permohonan surat aktif.</Text>
        ) : (
          requests.map((item) => (
            <Pressable key={item.id} style={styles.requestItem} onPress={() => openRequestDetail(item)}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>{item.nama_surat ?? 'Surat'}</Text>
                <Text style={styles.status}>{item.status_label}</Text>
              </View>
              {item.keterangan ? <Text style={styles.requestText} numberOfLines={2}>{item.keterangan}</Text> : null}
              <Text style={styles.requestMeta}>{formatDate(item.updated_at ?? item.created_at)}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Modal visible={selectedRequest !== null} transparent animationType="fade" onRequestClose={() => setSelectedRequest(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            {selectedRequest ? (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{selectedRequest.nama_surat ?? 'Surat'}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tutup detail surat"
                    style={styles.closeButton}
                    onPress={() => setSelectedRequest(null)}
                  >
                    <Ionicons name="close" size={22} color="#31515e" />
                  </Pressable>
                </View>
                <Text style={styles.statusDetail}>{selectedRequest.status_label}</Text>
                {requestDetailLoading ? (
                  <ActivityIndicator color="#008aa6" />
                ) : (
                  <ScrollView style={styles.detailBody}>
                    <DetailRow label="No. HP aktif" value={selectedRequest.no_hp_aktif} />
                    <DetailRow label="Keterangan" value={selectedRequest.keterangan} />
                    <DetailRow label="Alasan" value={selectedRequest.alasan} tone="danger" />
                    <DetailRow label="Dibuat" value={formatDate(selectedRequest.created_at)} />
                    <DetailRow label="Diperbarui" value={formatDate(selectedRequest.updated_at)} />
                    {selectedRequest.isian_form ? (
                      <View style={styles.detailGroup}>
                        <Text style={styles.detailGroupTitle}>Isian Form</Text>
                        {Object.entries(selectedRequest.isian_form)
                          .filter(([key]) => !['id_surat', 'url_surat', 'nik', 'nama', 'no_hp_aktif'].includes(key))
                          .map(([key, value]) => (
                            <DetailRow key={key} label={labelFromKey(key)} value={formatValue(value)} />
                          ))}
                      </View>
                    ) : null}
                  </ScrollView>
                )}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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

function DetailRow({ label, value, tone }: { label: string; value: string | null | undefined; tone?: 'danger' }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, tone === 'danger' && styles.detailDanger]}>{value}</Text>
    </View>
  );
}

function labelFromKey(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function SuratSelect({
  value,
  items,
  onChange,
}: {
  value: number | null;
  items: SuratType[];
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.id === value);

  return (
    <>
      <Pressable style={styles.selectButton} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.selectText : styles.selectPlaceholder}>
          {selected?.nama ?? 'Pilih jenis surat'}
        </Text>
        <Text style={styles.selectIcon}>v</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Pilih Jenis Surat</Text>
            <ScrollView style={styles.modalList}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.modalOption, item.id === value && styles.modalOptionActive]}
                  onPress={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, item.id === value && styles.modalOptionTextActive]}>{item.nama}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: SuratField;
  value: string;
  onChange: (value: string) => void;
}) {
  const isTextArea = field.type === 'textarea';
  const isSelect = field.type === 'select-manual' || field.type === 'select-otomatis';

  return (
    <View style={styles.dynamicField}>
      <Text style={styles.label}>
        {field.label}
        {field.required ? ' *' : ''}
      </Text>
      {isSelect ? (
        <View style={styles.optionList}>
          {field.options.map((option) => (
            <Pressable
              key={option}
              style={[styles.optionButton, value === option && styles.optionButtonActive]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.optionText, value === option && styles.optionTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={field.description || field.label}
          multiline={isTextArea}
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
          style={[styles.input, isTextArea && styles.textArea]}
          placeholderTextColor="#8ba0a8"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 14 },
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  message: {
    borderRadius: 8,
    backgroundColor: '#e7f7f4',
    color: '#006b63',
    padding: 12,
    fontWeight: '700',
  },
  section: { gap: 10, borderRadius: 8, backgroundColor: '#ffffff', padding: 14 },
  sectionTitle: { color: '#15323d', fontSize: 16, fontWeight: '800' },
  label: { color: '#415d68', fontWeight: '700' },
  selectButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#c7d6dd',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  selectText: { flex: 1, color: '#15323d', fontWeight: '700' },
  selectPlaceholder: { flex: 1, color: '#8ba0a8', fontWeight: '700' },
  selectIcon: { color: '#55727e', fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 50, 61, 0.35)' },
  modalSheet: { maxHeight: '72%', borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#ffffff', padding: 16 },
  modalTitle: { color: '#15323d', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  modalList: { maxHeight: 420 },
  modalOption: { borderBottomWidth: 1, borderBottomColor: '#e2eaee', paddingVertical: 13 },
  modalOptionActive: { backgroundColor: '#e5f7fb' },
  modalOptionText: { color: '#31515e', fontWeight: '700' },
  modalOptionTextActive: { color: '#006f86' },
  requirements: { gap: 4, borderRadius: 8, backgroundColor: '#f3f7f9', padding: 10 },
  dynamicFields: { gap: 10 },
  dynamicField: { gap: 7 },
  optionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: { borderWidth: 1, borderColor: '#c7d6dd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  optionButtonActive: { borderColor: '#008aa6', backgroundColor: '#e5f7fb' },
  optionText: { color: '#415d68', fontWeight: '700' },
  optionTextActive: { color: '#006f86' },
  requirementBlock: { gap: 8, borderTopWidth: 1, borderTopColor: '#dce8ee', paddingTop: 10 },
  requirementText: { color: '#55727e' },
  documentOption: { borderWidth: 1, borderColor: '#c7d6dd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  documentOptionActive: { borderColor: '#00945f', backgroundColor: '#e7f7f4' },
  documentOptionText: { color: '#415d68', fontWeight: '700' },
  documentOptionTextActive: { color: '#00764d' },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#c7d6dd',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#15323d',
    backgroundColor: '#ffffff',
  },
  textArea: { minHeight: 92, paddingTop: 12, textAlignVertical: 'top' },
  buttonDisabled: { opacity: 0.55 },
  empty: { color: '#55727e' },
  requestItem: { gap: 8, borderTopWidth: 1, borderTopColor: '#e2eaee', paddingTop: 12 },
  requestHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  requestTitle: { flex: 1, color: '#15323d', fontWeight: '800' },
  requestText: { color: '#55727e' },
  requestMeta: { color: '#7a929c', fontSize: 12 },
  status: { borderRadius: 6, backgroundColor: '#eef4f7', color: '#415d68', paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 },
  detailBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 50, 61, 0.35)' },
  detailSheet: { maxHeight: '78%', gap: 10, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#ffffff', padding: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  detailTitle: { flex: 1, color: '#15323d', fontSize: 18, fontWeight: '800' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4f7',
    borderWidth: 1,
    borderColor: '#dce8ee',
  },
  statusDetail: { alignSelf: 'flex-start', borderRadius: 6, backgroundColor: '#e5f7fb', color: '#006f86', paddingHorizontal: 8, paddingVertical: 5, fontWeight: '800' },
  detailBody: { maxHeight: 420 },
  detailGroup: { marginTop: 12 },
  detailGroupTitle: { color: '#15323d', fontWeight: '800', marginBottom: 6 },
  detailRow: { gap: 3, borderBottomWidth: 1, borderBottomColor: '#e2eaee', paddingVertical: 8 },
  detailLabel: { color: '#7a929c', fontWeight: '700' },
  detailValue: { color: '#31515e', lineHeight: 20 },
  detailDanger: { color: '#c2410c', fontWeight: '700' },
});
