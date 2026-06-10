// / scan capture state
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera as CameraIcon, ImagePlus } from 'lucide-react-native';
import { useRef } from 'react';
import { Linking, View } from 'react-native';

import { Button } from '@ui/Button';
import { Text } from '@ui/Text';

export interface ScanCaptureProps {
  readonly onCaptured: (uri: string) => void;
}

export function ScanCapture({ onCaptured }: ScanCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  async function capture(): Promise<void> {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (photo?.uri !== undefined) onCaptured(photo.uri);
  }

  async function pickFromGallery(): Promise<void> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri !== undefined) onCaptured(uri);
  }

  if (permission === null) {
    return <View className="flex-1 bg-ink" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-paper px-8">
        <Text variant="display-lg" className="text-center">
          Larder needs the camera to scan receipts.
        </Text>
        <View className="mt-4 w-full gap-2">
          {permission.canAskAgain ? (
            <Button
              label="Allow camera"
              kind="accent"
              size="lg"
              full
              onPress={() => void requestPermission()}
            />
          ) : (
            <Button
              label="Open settings"
              kind="accent"
              size="lg"
              full
              onPress={() => void Linking.openSettings()}
            />
          )}
          <Button
            label="Pick from gallery"
            kind="secondary"
            size="lg"
            icon={ImagePlus}
            full
            onPress={() => void pickFromGallery()}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <View
          style={{
            width: '80%',
            height: '64%',
            borderWidth: 2,
            borderColor: 'rgba(255,252,244,0.7)',
            borderRadius: 12,
          }}
        />
        <View
          className="mt-4 rounded-pill px-3 py-1"
          style={{ backgroundColor: 'rgba(28,24,20,0.55)' }}
        >
          <Text variant="body" tone="inverse">
            Aim at a flat receipt
          </Text>
        </View>
      </View>
      <View className="absolute inset-x-0 bottom-0 gap-2 px-6 pb-10">
        <Button
          label="Capture"
          kind="accent"
          size="lg"
          icon={CameraIcon}
          full
          onPress={() => void capture()}
        />
        <Button
          label="Pick from gallery"
          kind="ghost"
          size="lg"
          icon={ImagePlus}
          full
          onPress={() => void pickFromGallery()}
        />
      </View>
    </View>
  );
}
