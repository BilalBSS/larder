import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { ScanCapture } from '@/components/scan/ScanCapture';

jest.mock('expo-camera', () => {
  const react = jest.requireActual('react');
  return {
    CameraView: react.forwardRef((_props: unknown, ref: unknown) => {
      react.useImperativeHandle(ref, () => ({
        takePictureAsync: async () => ({ uri: 'file://shot.jpg' }),
      }));
      return null;
    }),
    useCameraPermissions: jest.fn(),
  };
});
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const mockPermissions = useCameraPermissions as jest.Mock;
const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions.mockReturnValue([{ granted: true, canAskAgain: true }, jest.fn()]);
  mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://pick.jpg' }] });
});

describe('ScanCapture', () => {
  it('captures from the camera', async () => {
    const onCaptured = jest.fn();
    render(<ScanCapture onCaptured={onCaptured} />);
    fireEvent.press(screen.getByRole('button', { name: 'Capture' }));
    await waitFor(() => expect(onCaptured).toHaveBeenCalledWith('file://shot.jpg'));
  });

  it('picks from the gallery', async () => {
    const onCaptured = jest.fn();
    render(<ScanCapture onCaptured={onCaptured} />);
    fireEvent.press(screen.getByRole('button', { name: 'Pick from gallery' }));
    await waitFor(() => expect(onCaptured).toHaveBeenCalledWith('file://pick.jpg'));
  });

  it('shows the permission-denied state with an allow action', () => {
    mockPermissions.mockReturnValue([{ granted: false, canAskAgain: true }, jest.fn()]);
    render(<ScanCapture onCaptured={jest.fn()} />);
    expect(screen.getByText(/needs the camera/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Allow camera' })).toBeOnTheScreen();
  });

  it('offers settings when permission cannot be re-requested', () => {
    mockPermissions.mockReturnValue([{ granted: false, canAskAgain: false }, jest.fn()]);
    render(<ScanCapture onCaptured={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeOnTheScreen();
  });
});
