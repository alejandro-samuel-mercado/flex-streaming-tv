import React, { useMemo, useState, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  PressableProps,
} from 'react-native';
import { TV } from '../../theme/tv';

interface TVFocusableProps extends Omit<PressableProps, 'style'> {
  style?: ViewStyle | ViewStyle[];
  focusedStyle?: ViewStyle;
  children: React.ReactNode;
  scaleOnFocus?: number;
  disableScale?: boolean;
  focusBorderRadius?: number;
  hasTVPreferredFocus?: boolean;
}

/**
 * TVFocusable — Zero-overhead focusable wrapper.
 */
const TVFocusable = React.forwardRef<any, TVFocusableProps>(
  (
    {
      children,
      style,
      focusedStyle,
      scaleOnFocus = TV.cardFocusedScale,
      disableScale = false,
      focusBorderRadius = TV.focusBorderRadius,
      hasTVPreferredFocus,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback((e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    }, [onBlur]);

    // Memoize the base style to avoid flattening on every render
    const flatStyle = useMemo(() => Array.isArray(style) ? StyleSheet.flatten(style) : style, [style]);

    return (
      <Pressable
        ref={ref}
        focusable={true}
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
        style={[
          flatStyle,
          isFocused && !disableScale && { transform: [{ scale: scaleOnFocus }] },
          isFocused && s.focused,
          isFocused && { borderRadius: focusBorderRadius },
          isFocused && focusedStyle,
        ]}
      >
        {children}
      </Pressable>
    );
  }
);

TVFocusable.displayName = 'TVFocusable';
export default TVFocusable;

const s = StyleSheet.create({
  focused: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.75)',
  },
});
