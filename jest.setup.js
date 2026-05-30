// / jest rn mocks
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  const zeroInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  const zeroFrame = { x: 0, y: 0, width: 0, height: 0 };
  return {
    __esModule: true,
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, style, className }) => (
      <View style={style} className={className}>
        {children}
      </View>
    ),
    SafeAreaInsetsContext: { Consumer: ({ children }) => children(zeroInsets) },
    useSafeAreaInsets: () => zeroInsets,
    useSafeAreaFrame: () => zeroFrame,
    initialWindowMetrics: null,
  };
});

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
