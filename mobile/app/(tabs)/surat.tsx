import { StyleSheet, Text, View } from 'react-native';

export default function SuratScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Surat</Text>
      <Text style={styles.text}>Daftar jenis surat dan form permohonan akan memakai API tahap berikutnya.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#eef4f7' },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  text: { marginTop: 8, color: '#55727e' },
});
