// / jest rn mocks
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@shopify/flash-list', () => {
  const RN = require('react-native');
  return { __esModule: true, FlashList: RN.FlatList };
});

jest.mock('@expo/vector-icons', () => {
  const RN = require('react-native');
  return { __esModule: true, Ionicons: RN.View, MaterialIcons: RN.View };
});
