import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import { ApiError } from '@/api/client';
import { AppButton } from '@/components/AppButton';
import { AppDialog } from '@/components/AppDialog';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { Ionicons } from '@expo/vector-icons';
import {
  createSatisfaction,
  createComplaint,
  getAgenda,
  getArticle,
  getArticles,
  getComplaints,
  getGallery,
  getGalleryDetail,
  getPublicDocuments,
  getSatisfaction,
  getSynergyPrograms,
  getVillageInfo,
  type AgendaItem,
  type Complaint,
  type GalleryItem,
  type PublicArticle,
  type PublicDocument,
  type SatisfactionEntry,
  type SatisfactionOption,
  type SatisfactionSummary,
  type SynergyProgram,
  type VillageInfo,
} from '@/api/public';

type FullscreenImageData = {
  url: string;
  title: string;
};

export function ArticlesScreen() {
  const [items, setItems] = useState<PublicArticle[]>([]);
  const [selected, setSelected] = useState<PublicArticle | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<FullscreenImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await getArticles();
    setItems(response.data.items);
  }, []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setNotice(null);
    load().catch((error) => setNotice(error instanceof Error ? error.message : 'Artikel gagal dimuat.')).finally(() => setLoading(false));
  });

  async function openDetail(item: PublicArticle) {
    setSelected(item);
    setDetailLoading(true);
    try {
      const response = await getArticle(item.id);
      setSelected(response.data.item);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Detail artikel gagal dimuat.');
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <ListPage title="Artikel" loading={loading} notice={notice} refreshing={refreshing} onRefresh={() => refresh(load, setRefreshing, setNotice)}>
      {items.length === 0 ? <Empty text="Belum ada artikel." /> : items.map((item) => <ArticleCard key={item.id} item={item} onPress={() => openDetail(item)} />)}
      <DetailModal title={selected?.judul ?? ''} visible={selected !== null} onClose={() => setSelected(null)}>
        {selected?.gambar_url ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Buka gambar artikel fullscreen"
            onPress={() => setFullscreenImage({ url: selected.gambar_url!, title: selected.judul })}
          >
            <Image source={{ uri: selected.gambar_url }} style={styles.heroImage} />
          </Pressable>
        ) : null}
        {detailLoading ? <ActivityIndicator color="#008aa6" /> : <Text style={styles.detailText}>{selected?.isi || selected?.ringkasan}</Text>}
      </DetailModal>
      <FullscreenImageModal image={fullscreenImage} onClose={() => setFullscreenImage(null)} />
    </ListPage>
  );
}

export function GalleryScreen() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [children, setChildren] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<FullscreenImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await getGallery();
    setItems(response.data.items);
  }, []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setNotice(null);
    load().catch((error) => setNotice(error instanceof Error ? error.message : 'Galeri gagal dimuat.')).finally(() => setLoading(false));
  });

  async function openDetail(item: GalleryItem) {
    setSelected(item);
    setChildren([]);
    try {
      const response = await getGalleryDetail(item.id);
      setSelected(response.data.item);
      setChildren(response.data.children);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Detail galeri gagal dimuat.');
    }
  }

  return (
    <ListPage title="Galeri" loading={loading} notice={notice} refreshing={refreshing} onRefresh={() => refresh(load, setRefreshing, setNotice)}>
      {items.length === 0 ? <Empty text="Belum ada galeri." /> : (
        <View style={styles.photoGrid}>
          {items.map((item) => <GalleryTile key={item.id} item={item} onPress={() => openDetail(item)} />)}
        </View>
      )}
      <DetailModal title={selected?.nama ?? ''} visible={selected !== null} onClose={() => setSelected(null)}>
        {selected?.gambar_url ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Buka gambar fullscreen"
            onPress={() => setFullscreenImage({ url: selected.gambar_url!, title: selected.nama })}
          >
            <Image source={{ uri: selected.gambar_url }} style={styles.heroImage} />
          </Pressable>
        ) : null}
        {children.length > 0 ? (
          <View style={styles.photoGrid}>
            {children.map((item) => <GalleryTile key={item.id} item={item} onPress={() => setSelected(item)} />)}
          </View>
        ) : <Text style={styles.muted}>Tidak ada foto lain di album ini.</Text>}
      </DetailModal>
      <FullscreenImageModal image={fullscreenImage} onClose={() => setFullscreenImage(null)} />
    </ListPage>
  );
}

export function SynergyProgramsScreen() {
  const [items, setItems] = useState<SynergyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => setItems((await getSynergyPrograms()).data.items), []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setNotice(null);
    load().catch((error) => setNotice(error instanceof Error ? error.message : 'Sinergi program gagal dimuat.')).finally(() => setLoading(false));
  });

  return (
    <ListPage title="Sinergi Program" loading={loading} notice={notice} refreshing={refreshing} onRefresh={() => refresh(load, setRefreshing, setNotice)}>
      {items.length === 0 ? <Empty text="Belum ada sinergi program." /> : items.map((item) => (
        <Pressable key={item.uuid} style={styles.card} onPress={() => openUrl(item.tautan)}>
          {item.gambar_url ? <Image source={{ uri: item.gambar_url }} style={styles.thumbnail} /> : <View style={styles.thumbnailPlaceholder} />}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.judul}</Text>
            <Text style={styles.cardMeta}>{item.tautan ? 'Buka tautan' : 'Tidak ada tautan'}</Text>
          </View>
        </Pressable>
      ))}
    </ListPage>
  );
}

export function AgendaScreen() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => setItems((await getAgenda()).data.items), []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setNotice(null);
    load().catch((error) => setNotice(error instanceof Error ? error.message : 'Agenda gagal dimuat.')).finally(() => setLoading(false));
  });

  return (
    <ListPage title="Agenda" loading={loading} notice={notice} refreshing={refreshing} onRefresh={() => refresh(load, setRefreshing, setNotice)}>
      {items.length === 0 ? <Empty text="Belum ada agenda." /> : items.map((item) => <AgendaCard key={item.id} item={item} />)}
    </ListPage>
  );
}

export function PublicDocumentsScreen() {
  const [items, setItems] = useState<PublicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => setItems((await getPublicDocuments()).data.items), []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setNotice(null);
    load().catch((error) => setNotice(error instanceof Error ? error.message : 'Informasi publik gagal dimuat.')).finally(() => setLoading(false));
  });

  return (
    <ListPage title="Informasi Publik" loading={loading} notice={notice} refreshing={refreshing} onRefresh={() => refresh(load, setRefreshing, setNotice)}>
      {items.length === 0 ? <Empty text="Belum ada informasi publik." /> : items.map((item) => (
        <Pressable key={item.id} style={styles.listItem} onPress={() => openUrl(item.file_url)}>
          <Text style={styles.cardTitle}>{item.nama}</Text>
          <Text style={styles.cardMeta}>{[item.kategori, item.tahun].filter(Boolean).join(' - ') || 'Dokumen publik'}</Text>
          <Text style={styles.linkText}>{item.file_url ? 'Buka dokumen' : 'File belum tersedia'}</Text>
        </Pressable>
      ))}
    </ListPage>
  );
}

export function ComplaintsScreen() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [telepon, setTelepon] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);
  const load = useCallback(async () => setItems((await getComplaints()).data.items), []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setNotice(null);
    load().catch((error) => setNotice(error instanceof Error ? error.message : 'Pengaduan gagal dimuat.')).finally(() => setLoading(false));
  });

  async function submit() {
    setSubmitting(true);
    setNotice(null);
    try {
      await createComplaint({ judul: judul.trim(), isi: isi.trim(), telepon: telepon.trim() || undefined });
      setJudul('');
      setIsi('');
      setTelepon('');
      await load();
      setDialog({ title: 'Berhasil', message: 'Pengaduan berhasil dikirim.', variant: 'success' });
    } catch (error) {
      if (error instanceof ApiError) {
        setDialog({ title: 'Gagal', message: Object.values(error.errors).flat()[0] ?? error.message, variant: 'error' });
      } else {
        setDialog({ title: 'Gagal', message: error instanceof Error ? error.message : 'Pengaduan gagal dikirim.', variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ListPage title="Pengaduan" loading={loading} notice={notice} refreshing={refreshing} onRefresh={() => refresh(load, setRefreshing, setNotice)}>
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Buat Pengaduan</Text>
        <TextInput value={judul} onChangeText={setJudul} placeholder="Judul" style={styles.input} placeholderTextColor="#8ba0a8" />
        <TextInput value={telepon} onChangeText={setTelepon} placeholder="Nomor HP" keyboardType="phone-pad" style={styles.input} placeholderTextColor="#8ba0a8" />
        <TextInput value={isi} onChangeText={setIsi} placeholder="Isi pengaduan" multiline style={[styles.input, styles.textArea]} placeholderTextColor="#8ba0a8" />
        <AppButton label={submitting ? 'Mengirim...' : 'Kirim Pengaduan'} icon="send" onPress={submit} loading={submitting} />
      </View>
      {items.length === 0 ? <Empty text="Belum ada riwayat pengaduan." /> : items.map((item) => (
        <View key={item.id} style={styles.listItem}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{item.judul}</Text>
            <Text style={styles.badge}>{item.status_label}</Text>
          </View>
          <Text style={styles.cardPreview}>{item.isi}</Text>
          <Text style={styles.cardMeta}>{formatDate(item.created_at)}</Text>
          {item.replies.length > 0 ? (
            <View style={styles.replyGroup}>
              {item.replies.map((reply) => (
                <View key={reply.id} style={styles.replyItem}>
                  <Text style={styles.replyAuthor}>{reply.nama ?? 'Administrator'} Menanggapi</Text>
                  <Text style={styles.cardPreview}>{reply.isi}</Text>
                  <Text style={styles.cardMeta}>{formatDate(reply.created_at)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        variant={dialog?.variant}
        onClose={() => setDialog(null)}
      />
    </ListPage>
  );
}

export function SatisfactionScreen() {
  const [options, setOptions] = useState<SatisfactionOption[]>([]);
  const [summary, setSummary] = useState<SatisfactionSummary[]>([]);
  const [history, setHistory] = useState<SatisfactionEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState<SatisfactionEntry | null>(null);
  const [availableAt, setAvailableAt] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant: 'success' | 'error' | 'warning' } | null>(null);

  const load = useCallback(async () => {
    const response = await getSatisfaction();
    setOptions(response.data.options);
    setSummary(response.data.summary);
    setHistory(response.data.history);
    setCurrentMonth(response.data.current_month);
    setAvailableAt(response.data.available_at);
    setTotal(response.data.total);
  }, []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setNotice(null);
    load().catch((error) => setNotice(error instanceof Error ? error.message : 'Data kepuasan gagal dimuat.')).finally(() => setLoading(false));
  });

  async function submit(value: number) {
    if (currentMonth) {
      setDialog({ title: 'Perhatian', message: 'Anda sudah memberi penilaian bulan ini.', variant: 'warning' });
      return;
    }

    setSubmitting(value);
    setNotice(null);
    try {
      const response = await createSatisfaction({ pilihan: value });
      await load();
      setDialog({ title: 'Berhasil', message: response.message, variant: 'success' });
    } catch (error) {
      if (error instanceof ApiError) {
        setDialog({ title: 'Gagal', message: Object.values(error.errors).flat()[0] ?? error.message, variant: 'error' });
      } else {
        setDialog({ title: 'Gagal', message: error instanceof Error ? error.message : 'Penilaian gagal disimpan.', variant: 'error' });
      }
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <ListPage title="Kepuasan Layanan" loading={loading} notice={notice} refreshing={refreshing} onRefresh={() => refresh(load, setRefreshing, setNotice)}>
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Berikan Penilaian</Text>
        <Text style={styles.cardPreview}>
          {currentMonth
            ? `Bulan ini Anda sudah memilih ${currentMonth.label}. Penilaian berikutnya tersedia ${formatDate(availableAt)}.`
            : 'Pilih tingkat kepuasan Anda terhadap layanan mandiri desa.'}
        </Text>
        <View style={styles.satisfactionGrid}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.satisfactionOption, (submitting === option.value || currentMonth !== null) && styles.buttonDisabled]}
              onPress={() => submit(option.value)}
              disabled={submitting !== null || currentMonth !== null}
            >
              <View style={styles.satisfactionIconBlock}>
                <Text style={styles.satisfactionMark}>{satisfactionMark(option.value)}</Text>
              </View>
              <View style={styles.satisfactionLabelBlock}>
                <Text style={styles.satisfactionLabel}>{submitting === option.value ? 'Menyimpan...' : option.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Ringkasan Kepuasan</Text>
        <Text style={styles.cardMeta}>Total penilaian: {total}</Text>
        {summary.map((item) => (
          <View key={item.value} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <View style={styles.summaryBarTrack}>
              <View style={[styles.summaryBarFill, { width: `${Math.min(item.percentage, 100)}%` }]} />
            </View>
            <Text style={styles.summaryValue}>{item.percentage.toFixed(2)}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Riwayat Anda</Text>
        {history.length === 0 ? <Empty text="Belum ada penilaian." /> : history.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardMeta}>{formatDate(item.tanggal)}</Text>
          </View>
        ))}
      </View>
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        variant={dialog?.variant}
        onClose={() => setDialog(null)}
      />
    </ListPage>
  );
}

export function VillageInfoScreen() {
  const [info, setInfo] = useState<VillageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => setInfo((await getVillageInfo()).data.desa), []);

  useRefreshOnFocus((isInitial) => {
    if (isInitial) {
      setLoading(true);
    }
    setNotice(null);
    load().catch((error) => setNotice(error instanceof Error ? error.message : 'Info desa gagal dimuat.')).finally(() => setLoading(false));
  });

  return (
    <ListPage title="Info Desa" loading={loading} notice={notice} refreshing={refreshing} onRefresh={() => refresh(load, setRefreshing, setNotice)}>
      {info ? (
        <>
          <View style={styles.identity}>
            {info.logo_url ? <Image source={{ uri: info.logo_url }} style={styles.logo} /> : null}
            <View style={styles.identityText}>
              <Text style={styles.villageName}>{info.nama}</Text>
              <Text style={styles.cardMeta}>{[info.kecamatan, info.kabupaten, info.provinsi].filter(Boolean).join(', ')}</Text>
            </View>
          </View>
          {info.static_map_url ? <Image source={{ uri: info.static_map_url }} style={styles.map} /> : <View style={styles.mapPlaceholder}><Text style={styles.muted}>Koordinat desa belum diisi.</Text></View>}
          <AppButton label="Navigasi Google Maps" icon="navigate" onPress={() => openUrl(info.map_url)} />
          <InfoRow label="Alamat Kantor" value={info.alamat_kantor} />
          <InfoRow label="Telepon" value={info.telepon} />
          <InfoRow label="Email" value={info.email} />
          <InfoRow label="Website" value={info.website} onPress={() => openUrl(info.website)} />
          <InfoRow label="Kontak" value={[info.nama_kontak, info.jabatan_kontak, info.hp_kontak].filter(Boolean).join(' - ')} />
          <InfoRow label="Kode Desa" value={info.kode_desa} />
          <InfoRow label="Koordinat" value={info.lat && info.lng ? `${info.lat}, ${info.lng}` : null} />
        </>
      ) : <Empty text="Info desa belum tersedia." />}
    </ListPage>
  );
}

function ArticleCard({ item, onPress }: { item: PublicArticle; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {item.gambar_url ? <Image source={{ uri: item.gambar_url }} style={styles.thumbnail} /> : <View style={styles.thumbnailPlaceholder} />}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.judul}</Text>
        <Text style={styles.cardPreview} numberOfLines={3}>{item.ringkasan}</Text>
        <Text style={styles.cardMeta}>{formatDate(item.tgl_upload)}</Text>
      </View>
    </Pressable>
  );
}

function GalleryTile({ item, onPress }: { item: GalleryItem; onPress: () => void }) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      {item.gambar_url ? <Image source={{ uri: item.gambar_url }} style={styles.tileImage} /> : <View style={styles.tileImage} />}
      <Text style={styles.tileTitle} numberOfLines={2}>{item.nama}</Text>
      {item.child_count > 0 ? <Text style={styles.cardMeta}>{item.child_count} foto</Text> : null}
    </Pressable>
  );
}

function AgendaCard({ item }: { item: AgendaItem }) {
  return (
    <View style={styles.card}>
      {item.gambar_url ? <Image source={{ uri: item.gambar_url }} style={styles.thumbnail} /> : <View style={styles.thumbnailPlaceholder} />}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.judul}</Text>
        <Text style={styles.cardMeta}>{formatDate(item.tanggal)}</Text>
        {item.lokasi ? <Text style={styles.cardMeta}>{item.lokasi}</Text> : null}
        {item.koordinator ? <Text style={styles.cardMeta}>Koordinator: {item.koordinator}</Text> : null}
        {item.ringkasan ? <Text style={styles.cardPreview} numberOfLines={3}>{item.ringkasan}</Text> : null}
      </View>
    </View>
  );
}

function ListPage({
  title,
  loading,
  notice,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  loading: boolean;
  notice: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>{title}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {loading ? <ActivityIndicator color="#008aa6" /> : children}
    </ScrollView>
  );
}

function DetailModal({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup detail"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color="#31515e" />
            </Pressable>
          </View>
          <ScrollView style={styles.detailBody}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FullscreenImageModal({ image, onClose }: { image: FullscreenImageData | null; onClose: () => void }) {
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string; variant: 'success' | 'error' | 'warning' } | null>(null);

  async function downloadImage() {
    if (!image || downloadingImage) {
      return;
    }

    setDownloadingImage(true);
    try {
      const fileUri = `${FileSystem.cacheDirectory}${downloadFileName(image.url)}`;
      const result = await FileSystem.downloadAsync(image.url, fileUri);
      await MediaLibrary.saveToLibraryAsync(result.uri);
      setDialog({ title: 'Berhasil', message: 'Gambar berhasil disimpan ke galeri perangkat.', variant: 'success' });
    } catch (error) {
      setDialog({ title: 'Gagal', message: error instanceof Error ? error.message : 'Gambar gagal diunduh.', variant: 'error' });
    } finally {
      setDownloadingImage(false);
    }
  }

  return (
    <>
      <Modal visible={image !== null} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.fullscreenBackdrop}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>{image?.title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Download gambar"
              disabled={downloadingImage}
              style={[styles.fullscreenActionButton, downloadingImage && styles.buttonDisabled]}
              onPress={downloadImage}
            >
              {downloadingImage ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download" size={22} color="#fff" />}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup gambar fullscreen"
              style={styles.fullscreenActionButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          {image ? <Image source={{ uri: image.url }} style={styles.fullscreenImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        variant={dialog?.variant}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

function InfoRow({ label, value, onPress }: { label: string; value: string | null | undefined; onPress?: () => void }) {
  if (!value) {
    return null;
  }

  const content = (
    <>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, onPress && styles.linkText]}>{value}</Text>
    </>
  );

  return onPress ? <Pressable style={styles.infoRow} onPress={onPress}>{content}</Pressable> : <View style={styles.infoRow}>{content}</View>;
}

async function refresh(load: () => Promise<void>, setRefreshing: (value: boolean) => void, setNotice: (value: string | null) => void) {
  setRefreshing(true);
  setNotice(null);
  try {
    await load();
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Data gagal dimuat.');
  } finally {
    setRefreshing(false);
  }
}

function openUrl(url: string | null | undefined) {
  if (!url) {
    return;
  }

  Linking.openURL(url);
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}

function satisfactionMark(value: number) {
  return ['SP', 'P', 'CP', 'TP'][value - 1] ?? 'N';
}

function downloadFileName(url: string) {
  const cleanPath = url.split('?')[0] ?? '';
  const rawName = decodeURIComponent(cleanPath.split('/').pop() || '');
  const safeName = rawName.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');

  if (/\.(jpe?g|png|gif|webp)$/i.test(safeName)) {
    return safeName;
  }

  return `galeri-${Date.now()}.jpg`;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 20, gap: 12 },
  title: { color: '#15323d', fontSize: 24, fontWeight: '800' },
  notice: { borderRadius: 8, backgroundColor: '#e7f7f4', color: '#006b63', padding: 12, fontWeight: '700' },
  empty: { color: '#55727e' },
  muted: { color: '#7a929c' },
  card: { flexDirection: 'row', gap: 12, borderRadius: 8, backgroundColor: '#fff', padding: 12 },
  thumbnail: { width: 86, height: 86, borderRadius: 8, backgroundColor: '#dce8ee' },
  thumbnailPlaceholder: { width: 86, height: 86, borderRadius: 8, backgroundColor: '#dce8ee' },
  cardBody: { flex: 1, gap: 5 },
  cardTitle: { flex: 1, color: '#15323d', fontSize: 16, fontWeight: '800' },
  cardPreview: { color: '#415d68', lineHeight: 20 },
  cardMeta: { color: '#7a929c', fontSize: 12 },
  linkText: { color: '#0088a8', fontWeight: '800' },
  listItem: { gap: 7, borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', gap: 7, borderRadius: 8, backgroundColor: '#fff', padding: 10 },
  tileImage: { width: '100%', aspectRatio: 1.25, borderRadius: 8, backgroundColor: '#dce8ee' },
  tileTitle: { color: '#15323d', fontWeight: '800' },
  heroImage: { width: '100%', aspectRatio: 1.55, borderRadius: 8, backgroundColor: '#dce8ee', marginBottom: 12 },
  fullscreenBackdrop: { flex: 1, backgroundColor: '#000', paddingTop: 42, paddingHorizontal: 14, paddingBottom: 18 },
  fullscreenHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  fullscreenTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800' },
  fullscreenActionButton: {
    width: 38,
    height: 38,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  fullscreenImage: { flex: 1, width: '100%' },
  form: { gap: 10, borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  sectionTitle: { color: '#15323d', fontSize: 16, fontWeight: '800' },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#c7d6dd', borderRadius: 8, paddingHorizontal: 12, color: '#15323d', backgroundColor: '#fff' },
  textArea: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  buttonDisabled: { opacity: 0.55 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  badge: { borderRadius: 6, backgroundColor: '#e5f7fb', color: '#006f86', paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: '800' },
  replyGroup: { gap: 8, borderTopWidth: 1, borderTopColor: '#e2eaee', marginTop: 4, paddingTop: 10 },
  replyItem: { gap: 5, borderLeftWidth: 3, borderLeftColor: '#00a86b', paddingLeft: 10 },
  replyAuthor: { color: '#0088a8', fontWeight: '800' },
  satisfactionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  satisfactionOption: { width: '48%', minHeight: 82, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#0073b7' },
  satisfactionIconBlock: { width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#005f98' },
  satisfactionLabelBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  satisfactionMark: { color: '#fff', fontSize: 18, fontWeight: '900' },
  satisfactionLabel: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  summaryRow: { gap: 6 },
  summaryLabel: { color: '#15323d', fontWeight: '800' },
  summaryBarTrack: { height: 10, overflow: 'hidden', borderRadius: 8, backgroundColor: '#dce8ee' },
  summaryBarFill: { height: '100%', borderRadius: 8, backgroundColor: '#00a86b' },
  summaryValue: { color: '#55727e', fontSize: 12, fontWeight: '800' },
  historyItem: { gap: 4, borderTopWidth: 1, borderTopColor: '#e2eaee', paddingTop: 10 },
  identity: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#fff', padding: 14 },
  logo: { width: 58, height: 58, borderRadius: 8, backgroundColor: '#dce8ee' },
  identityText: { flex: 1, gap: 4 },
  villageName: { color: '#15323d', fontSize: 18, fontWeight: '800' },
  map: { width: '100%', aspectRatio: 1.75, borderRadius: 8, backgroundColor: '#dce8ee' },
  mapPlaceholder: { minHeight: 190, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#dce8ee' },
  infoRow: { gap: 3, borderRadius: 8, backgroundColor: '#fff', padding: 12 },
  infoLabel: { color: '#7a929c', fontSize: 12, fontWeight: '800' },
  infoValue: { color: '#15323d', fontSize: 15, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 50, 61, 0.35)' },
  modalSheet: { maxHeight: '82%', gap: 10, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#fff', padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  modalTitle: { flex: 1, color: '#15323d', fontSize: 18, fontWeight: '800' },
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
  detailBody: { maxHeight: 520 },
  detailText: { color: '#31515e', fontSize: 15, lineHeight: 22 },
});
