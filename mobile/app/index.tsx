import { useAuth } from '@/auth/AuthProvider';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, isLoading, selectedVillage } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!selectedVillage) {
    return <Redirect href="/(auth)/pilih-desa" />;
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
