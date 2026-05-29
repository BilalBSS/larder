import { TextInput, type TextInputProps } from 'react-native';

export type TextFieldProps = TextInputProps;

export function TextField({ className, ...rest }: TextFieldProps) {
  return (
    <TextInput
      placeholderTextColor="#8A8178"
      className={`rounded-lg border border-line bg-surface px-3 py-2 text-body text-ink ${className ?? ''}`}
      {...rest}
    />
  );
}
