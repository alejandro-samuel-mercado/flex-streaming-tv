import React, { useRef, useState, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  PressableProps,
  Animated,
  Easing,
} from 'react-native';
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
 *   - Scale animation (1.08 default) using highly-performant native Animated API
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
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      if (!disableScale) {
        Animated.timing(scaleAnim, {
          toValue: scaleOnFocus,
          duration: TV.focusAnimDuration,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }).start();
      }
      onFocusChange?.(true);
    }, [disableScale, scaleOnFocus, onFocusChange, scaleAnim]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: TV.focusAnimDuration,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
      onFocusChange?.(false);
    }, [onFocusChange, scaleAnim]);

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
            { transform: [{ scale: scaleAnim }] },
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
    // Removed shadows for optimal Android TV layout performance
  },
});
