import * as SecureStore from 'expo-secure-store';

const VILLAGE_KEY = 'opensid.mobile.village';

export interface Village {
  id: string;
  nama: string;
  api_url: string;
}

export async function getSelectedVillage(): Promise<Village | null> {
  const data = await SecureStore.getItemAsync(VILLAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as Village;
  } catch {
    return null;
  }
}

export async function setSelectedVillage(village: Village) {
  await SecureStore.setItemAsync(VILLAGE_KEY, JSON.stringify(village));
}

export async function clearSelectedVillage() {
  await SecureStore.deleteItemAsync(VILLAGE_KEY);
}
