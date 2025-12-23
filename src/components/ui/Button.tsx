import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';

import { colors, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

type Props = TouchableOpacityProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  style,
  onPress,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  const handlePress = (event: GestureResponderEvent) => {
    if (isDisabled) {
      return;
    }
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'ghost' || variant === 'outline' ? colors.text : colors.surface
          }
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'ghost'
              ? styles.textGhost
              : variant === 'outline'
                ? styles.textOutline
                : variant === 'danger'
                  ? styles.textDanger
                  : styles.textDefault,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
  },
  textDefault: {
    color: colors.surface,
  },
  textDanger: {
    color: colors.surface,
  },
  textGhost: {
    color: colors.text,
  },
  textOutline: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.65,
  },
});
