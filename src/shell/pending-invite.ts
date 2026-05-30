// / pending invite token store
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'larder.pending_invite_token';

export async function setPendingInvite(token: string): Promise<void> {
  await AsyncStorage.setItem(KEY, token);
}

export async function getPendingInvite(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function clearPendingInvite(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
