import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingInvite,
  getPendingInvite,
  setPendingInvite,
} from '@/app/(auth)/pending-invite';

const KEY = 'larder.pending_invite_token';
const setItem = AsyncStorage.setItem as jest.Mock;
const getItem = AsyncStorage.getItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pending invite store', () => {
  it('persists the token under the shared key', async () => {
    await setPendingInvite('tok-1');
    expect(setItem).toHaveBeenCalledWith(KEY, 'tok-1');
  });

  it('reads back the stored token', async () => {
    getItem.mockResolvedValue('tok-2');
    expect(await getPendingInvite()).toBe('tok-2');
    expect(getItem).toHaveBeenCalledWith(KEY);
  });

  it('returns null when nothing is stored', async () => {
    getItem.mockResolvedValue(null);
    expect(await getPendingInvite()).toBeNull();
  });

  it('clears the stored token', async () => {
    await clearPendingInvite();
    expect(removeItem).toHaveBeenCalledWith(KEY);
  });
});
