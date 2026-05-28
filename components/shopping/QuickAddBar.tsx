// / quick add bar
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@ui/Button';
import { TextField } from '@ui/TextField';

export interface QuickAddBarProps {
  readonly onAdd: (name: string) => void;
  readonly disabled?: boolean;
}

export function QuickAddBar({ onAdd, disabled = false }: QuickAddBarProps) {
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    onAdd(trimmed);
    setText('');
  };

  return (
    <View className="flex-row items-center gap-2 px-4 py-3">
      <View className="flex-1">
        <TextField
          value={text}
          onChangeText={setText}
          placeholder="Add an item"
          returnKeyType="done"
          onSubmitEditing={submit}
          editable={!disabled}
          accessibilityLabel="new item name"
        />
      </View>
      <Button label="Add" onPress={submit} disabled={disabled} />
    </View>
  );
}
