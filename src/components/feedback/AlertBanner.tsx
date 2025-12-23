import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '@/theme';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

type Props = {
  visible: boolean;
  message: string;
  title?: string;
  type?: AlertType;
  autoHideDuration?: number;
  onHide?: () => void;
};

export function AlertBanner({
  visible,
  message,
  title,
  type = 'info',
  autoHideDuration = 3200,
  onHide,
}: Props) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = useMemo(() => {
    const tone = {
      success: colors.success,
      error: colors.danger,
      warning: colors.warning,
      info: colors.primary,
    }[type];

    return { background: tone, text: colors.surface };
  }, [type]);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      if (timer.current) {
        clearTimeout(timer.current);
      }

      timer.current = setTimeout(() => {
        onHide?.();
      }, autoHideDuration);
    } else {
      Animated.timing(translateY, {
        toValue: -140,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [visible, autoHideDuration, onHide, translateY]);

  if (!visible) {
    return null;
  }

  const iconName = {
    success: 'checkmark-circle',
    error: 'close-circle',
    warning: 'alert-circle',
    info: 'information-circle',
  }[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
        { backgroundColor: palette.background },
      ]}
    >
      <Ionicons name={iconName as never} size={22} color={palette.text} />
      <View style={styles.textWrapper}>
        {title ? (
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        ) : null}
        <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
      </View>
      <TouchableOpacity hitSlop={10} onPress={onHide}>
        <Ionicons name="close" size={18} color={palette.text} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.lg,
    padding: spacing.md,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  textWrapper: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: spacing.xs / 2,
  },
  message: {
    fontSize: 14,
    opacity: 0.92,
  },
});
