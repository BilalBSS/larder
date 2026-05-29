// / quick add bar
import { useState } from 'react';

import { QuickAdd } from '@ui/QuickAdd';

export interface QuickAddBarProps {
  readonly onAdd: (name: string) => void;
  readonly onScan?: () => void;
  readonly disabled?: boolean;
}

export function QuickAddBar({ onAdd, onScan, disabled = false }: QuickAddBarProps) {
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    onAdd(trimmed);
    setText('');
  };

  return (
    <QuickAdd
      value={text}
      onChangeText={setText}
      onSubmit={submit}
      onScan={onScan}
      placeholder="Add an item"
      inputAccessibilityLabel="new item name"
      editable={!disabled}
    />
  );
}
