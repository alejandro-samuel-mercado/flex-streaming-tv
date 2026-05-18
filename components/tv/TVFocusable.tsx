import React, { useRef, useState, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  PressableProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';

interface TVFocusableProps extends Omit<PressableProps, 'style'> {
  style?: ViewStyle | ViewStyle[];
  focusedStyle?: ViewStyle;
  children: React.ReactNode;
  onFocusChange?: (focused: boolean) => void;
  scaleOnFocus?: number;
  disableScale?: boolean;
  focusBorderRadius?: number;
  hasTVPreferredFocus?: boolean;
}

/**
 * TVFocusable — Universal focusable wrapper for all TV interactive elements.
 * Applies:
 *   - 4px white border when focused
 *   - Cyan glow shadow
 *   - Scale animation (1.08 default)
 *   - 150ms transitions
 */
const TVFocusable = React.forwardRef<any, TVFocusableProps>(
  (
    {
      children,
      style,
      focusedStyle,
      onPress,
      onFocusChange,
      scaleOnFocus = TV.cardFocusedScale,
      disableScale = false,
      focusBorderRadius = TV.focusBorderRadius,
      hasTVPreferredFocus,
      ...rest
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const scale = useSharedValue(1);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      if (!disableScale) {
        scale.value = withTiming(scaleOnFocus, { duration: TV.focusAnimDuration });
      }
      onFocusChange?.(true);
    }, [disableScale, scaleOnFocus, onFocusChange]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      scale.value = withTiming(1, { duration: TV.focusAnimDuration });
      onFocusChange?.(false);
    }, [onFocusChange]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const flatStyle = Array.isArray(style) ? StyleSheet.flatten(style) : style;

    return (
      <Pressable
        ref={ref}
        focusable={true}
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={onPress}
        {...rest}
      >
        <Animated.View
          style={[
            flatStyle,
            animatedStyle,
            isFocused && [
              s.focused,
              { borderRadius: focusBorderRadius },
              focusedStyle,
            ],
          ]}
        >
          {children}
        </Animated.View>
      </Pressable>
    );
  }
);

TVFocusable.displayName = 'TVFocusable';
export default TVFocusable;

const s = StyleSheet.create({
  focused: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
  },
});
