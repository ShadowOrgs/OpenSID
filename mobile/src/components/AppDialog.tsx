import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type AppDialogVariant = 'success' | 'error' | 'warning' | 'info';

type AppDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  variant?: AppDialogVariant;
  actionLabel?: string;
  onClose: () => void;
};

const variantMeta: Record<AppDialogVariant, { icon: keyof typeof Ionicons.glyphMap; color: string; background: string }> = {
  success: { icon: 'checkmark', color: '#00a65a', background: '#e9f8ef' },
  error: { icon: 'close', color: '#dd4b39', background: '#fdecea' },
  warning: { icon: 'alert', color: '#f39c12', background: '#fff6e3' },
  info: { icon: 'information', color: '#0073b7', background: '#e8f4fb' },
};

export function AppDialog({ visible, title, message, variant = 'info', actionLabel = 'OK', onClose }: AppDialogProps) {
  const meta = variantMeta[variant];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconRing, { borderColor: meta.color, backgroundColor: meta.background }]}>
            <Ionicons name={meta.icon} size={34} color={meta.color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={[styles.action, { backgroundColor: meta.color }]} onPress={onClose}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21, 50, 61, 0.42)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 72,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { color: '#15323d', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { color: '#415d68', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  action: { minWidth: 124, minHeight: 42, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingHorizontal: 18 },
  actionText: { color: '#fff', fontWeight: '800' },
});
