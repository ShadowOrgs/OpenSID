import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type AppButtonProps = PressableProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ label, icon, loading = false, compact = false, disabled, style, ...props }: AppButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={[styles.button, compact && styles.compact, (disabled || loading) && styles.disabled, style]}
    >
      <View style={[styles.iconBlock, compact && styles.iconBlockCompact]}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name={icon} size={compact ? 18 : 22} color="#fff" />}
      </View>
      <View style={styles.labelBlock}>
        <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#0073b7',
  },
  compact: { minHeight: 38, alignSelf: 'flex-start' },
  disabled: { opacity: 0.55 },
  iconBlock: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#005f98',
  },
  iconBlockCompact: { width: 40 },
  labelBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  label: { color: '#fff', fontWeight: '800', fontSize: 15 },
  labelCompact: { fontSize: 13 },
});
