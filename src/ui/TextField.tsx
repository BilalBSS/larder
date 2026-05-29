import { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { MUTED } from './tokens';

export type TextFieldProps = TextInputProps;

export function TextField({ className, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={MUTED}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      className={`rounded-2 border bg-surface px-3 py-2 font-manrope-medium text-body text-ink ${
        focused ? 'border-edge-press' : 'border-edge'
      } ${className ?? ''}`}
      {...rest}
    />
  );
}
