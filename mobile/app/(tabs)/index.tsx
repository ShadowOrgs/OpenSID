import { dashboard } from '@/api/dashboard';
import { useAuth } from '@/auth/AuthProvider';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { DashboardResponse } from '@/types/mandiri';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: dashboard });
  const menus = data?.data.menus ?? [];
  const slider = data?.data.slider ?? [];
  const runningTexts = data?.data.teks_berjalan ?? [];
  const [activeSlide, setActiveSlide] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const currentSlide = slider[activeSlide] ?? slider[0];
  const runningText = runningTexts.map((item) => item.teks).join('     •     ');
  const marqueeOffset = useRef(new Animated.Value(0)).current;
  const [marqueeWidth, setMarqueeWidth] = useState(0);
  const [marqueeTextWidth, setMarqueeTextWidth] = useState(0);

  useEffect(() => {
    if (slider.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % slider.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [slider.length]);

  useRefreshOnFocus(() => {
    void refetch();
  });

  useEffect(() => {
    if (!runningText || marqueeWidth <= 0 || marqueeTextWidth <= 0) {
      return;
    }

    marqueeOffset.setValue(marqueeWidth);

    const distance = marqueeWidth + marqueeTextWidth;
    const animation = Animated.loop(
      Animated.timing(marqueeOffset, {
        toValue: -marqueeTextWidth,
        duration: Math.max(9000, distance * 45),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [marqueeOffset, marqueeTextWidth, marqueeWidth, runningText]);

  function openMenu(key: string) {
    const routes: Record<string, string> = {
      surat: '/surat',
      pesan: '/pesan',
      profil: '/profil',
      lapak: '/lapak',
      artikel: '/artikel',
      galeri: '/galeri',
      agenda: '/agenda',
      informasi_publik: '/informasi-publik',
      pengaduan: '/pengaduan',
      kepuasan: '/kepuasan',
      info_desa: '/info-desa',
      sinergi_program: '/sinergi-program',
      bantuan: '/bantuan',
      perangkat: '/perangkat',
      dokumen: '/dokumen',
      biodata: '/biodata',
      kartu_keluarga: '/kartu-keluarga',
      ganti_pin: '/ganti-pin',
    };

    const route = routes[key];

    if (route) {
      router.push(route as never);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {currentSlide ? (
        <Pressable style={styles.slider} onPress={() => Linking.openURL(currentSlide.url)}>
          {currentSlide.gambar_url ? <Image source={{ uri: currentSlide.gambar_url }} style={styles.sliderImage} /> : null}
          <View style={styles.sliderCaption}>
            <Text style={styles.sliderTitle} numberOfLines={2}>{currentSlide.judul}</Text>
          </View>
          {slider.length > 1 ? (
            <View style={styles.sliderDots}>
              {slider.map((item, index) => (
                <Pressable key={item.id} style={[styles.sliderDot, index === activeSlide && styles.sliderDotActive]} onPress={() => setActiveSlide(index)} />
              ))}
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {runningTexts.length > 0 ? (
        <View style={styles.marquee}>
          <View style={styles.marqueeIcon}>
            <Ionicons name="volume-high" size={18} color="#fff" />
          </View>
          <View style={styles.marqueeTrack} onLayout={(event) => setMarqueeWidth(event.nativeEvent.layout.width)}>
            <Animated.Text
              numberOfLines={1}
              onLayout={(event) => setMarqueeTextWidth(event.nativeEvent.layout.width)}
              style={[styles.marqueeText, { transform: [{ translateX: marqueeOffset }] }]}
            >
              {runningText}
            </Animated.Text>
          </View>
        </View>
      ) : null}

      <View style={styles.header}>
        {data?.data.desa.logo_url ? <Image source={{ uri: data.data.desa.logo_url }} style={styles.logo} /> : null}
        <View style={styles.headerText}>
          <Text style={styles.village}>{data?.data.desa.nama ?? 'Desa'}</Text>
          <Text style={styles.name}>{user?.nama}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {menus.map((menu: DashboardResponse['menus'][number]) => {
          const palette = menuPalette(menu.key);

          return (
            <Pressable key={menu.key} style={[styles.card, { backgroundColor: palette.main }]} onPress={() => openMenu(menu.key)}>
              <View style={[styles.iconBlock, { backgroundColor: palette.dark }]}>
                <Ionicons name={iconName(menu.icon)} size={34} color="#fff" />
              </View>
              <View style={styles.cardLabelBlock}>
                <Text style={styles.cardText}>{menu.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Akses Cepat</Text>
      {data?.data.quick_links.map((item: DashboardResponse['quick_links'][number]) => (
        <Pressable key={item.key} style={styles.row} onPress={() => openMenu(item.key)}>
          <Text style={styles.rowText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={20} color="#55727e" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function iconName(name: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    'file-text': 'document-text',
    mail: 'mail',
    'shopping-cart': 'cart',
    newspaper: 'newspaper',
    images: 'images',
    calendar: 'calendar',
    megaphone: 'megaphone',
    'chat-alert': 'chatbubble-ellipses',
    happy: 'happy',
    'map-pin': 'location',
    link: 'link',
    'heart-handshake': 'heart',
    users: 'people',
    folder: 'folder',
  };

  return map[name] ?? 'apps';
}

function menuPalette(key: string) {
  const map: Record<string, { main: string; dark: string }> = {
    surat: { main: '#00a65a', dark: '#008d4c' },
    pesan: { main: '#ff981f', dark: '#d47a1f' },
    lapak: { main: '#00c0ef', dark: '#0097bc' },
    perangkat: { main: '#f0423c', dark: '#c63530' },
    artikel: { main: '#00a65a', dark: '#008d4c' },
    galeri: { main: '#00c0ef', dark: '#0097bc' },
    agenda: { main: '#ff981f', dark: '#d47a1f' },
    informasi_publik: { main: '#605ca8', dark: '#4b4788' },
    pengaduan: { main: '#f0423c', dark: '#c63530' },
    kepuasan: { main: '#00a65a', dark: '#008d4c' },
    info_desa: { main: '#00c0ef', dark: '#0097bc' },
    sinergi_program: { main: '#605ca8', dark: '#4b4788' },
    bantuan: { main: '#00a65a', dark: '#008d4c' },
    dokumen: { main: '#00c0ef', dark: '#0097bc' },
  };

  return map[key] ?? { main: '#00c0ef', dark: '#0097bc' };
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#ecf0f5' },
  content: { padding: 14, paddingBottom: 32 },
  slider: { height: 178, borderRadius: 4, overflow: 'hidden', backgroundColor: '#dce8ee', marginBottom: 8 },
  sliderImage: { width: '100%', height: '100%' },
  sliderCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'rgba(0, 0, 0, 0.42)' },
  sliderTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  sliderDots: { position: 'absolute', right: 10, top: 10, flexDirection: 'row', gap: 6 },
  sliderDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.55)' },
  sliderDotActive: { width: 18, backgroundColor: '#fff' },
  marquee: { minHeight: 38, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#0073b7', marginBottom: 14 },
  marqueeIcon: { width: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#005f98' },
  marqueeTrack: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  marqueeText: { color: '#fff', fontWeight: '800', paddingHorizontal: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  logo: { width: 34, height: 34, borderRadius: 6 },
  headerText: { flex: 1 },
  village: { color: '#0073b7', fontWeight: '800', fontSize: 15 },
  name: { color: '#263238', fontWeight: '800', fontSize: 20, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', minHeight: 86, borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  iconBlock: { width: 66, alignItems: 'center', justifyContent: 'center' },
  cardLabelBlock: { flex: 1, justifyContent: 'center', paddingHorizontal: 10 },
  cardText: { color: '#fff', fontWeight: '800', fontSize: 18, lineHeight: 22 },
  sectionTitle: { marginTop: 24, marginBottom: 10, fontSize: 16, fontWeight: '800', color: '#15323d' },
  row: { height: 50, borderRadius: 4, backgroundColor: '#fff', paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, borderLeftColor: '#00c0ef' },
  rowText: { fontWeight: '700', color: '#31515e' },
});
