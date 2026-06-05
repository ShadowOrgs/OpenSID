import { StyleSheet, Text, View } from 'react-native';

export default function PesanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pesan</Text>
      <Text style={styles.text}>Inbox, outbox, dan tulis pesan akan memakai API tahap berikutnya.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#eef4f7' },
  title: { fontSize: 24, fontWeight: '800', color: '#15323d' },
  text: { marginTop: 8, color: '#55727e' },
});
