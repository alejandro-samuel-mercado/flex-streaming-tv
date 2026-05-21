import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Delete, CornerDownLeft, Space, X, ArrowUpCircle, Hash } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';

const QWERTY_UPPER = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];
const QWERTY_LOWER = QWERTY_UPPER.map(r => r.map(c => c.toLowerCase()));
const SYMBOLS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['@','#','$','_','&','-','+','(',')'],
  ['*','"',"'",':',';','!','?'],
];

type KeyMode = 'UPPER' | 'LOWER' | 'SYMBOLS';

interface TVKeyboardProps {
  value: string;
  onChange: (val: string) => void;
  onClose?: () => void;
  onSubmit?: () => void;
}

function KeyButton({
  label, onPress, wide, icon, isDelete, isAction, isActive
}: {
  label?: string;
  onPress: () => void;
  wide?: boolean;
  icon?: React.ReactNode;
  isDelete?: boolean;
  isAction?: boolean;
  isActive?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      focusable
      onFocus={() => { setFocused(true); scale.value = withTiming(1.1, { duration: 120 }); }}
      onBlur={() => { setFocused(false); scale.value = withTiming(1, { duration: 120 }); }}
      onPress={onPress}
    >
      <Animated.View style={[
        s.key,
        wide && s.keyWide,
        isDelete && s.keyDelete,
        isAction && s.keyAction,
        isActive && s.keyActive,
        focused && s.keyFocused,
        animStyle,
      ]}>
        {icon ?? <Text style={[s.keyLabel, (focused || isActive) && s.keyLabelFocused]}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

function TVKeyboard({ value, onChange, onClose, onSubmit }: TVKeyboardProps) {
  const [mode, setMode] = useState<KeyMode>('UPPER');

  const handleChar = useCallback((c: string) => onChange(value + c), [value, onChange]);
  const handleBackspace = useCallback(() => onChange(value.slice(0, -1)), [value, onChange]);
  const handleSpace = useCallback(() => onChange(value + ' '), [value, onChange]);
  const handleClear = useCallback(() => onChange(''), [onChange]);

  const toggleCase = useCallback(() => {
    setMode(prev => prev === 'UPPER' ? 'LOWER' : 'UPPER');
  }, []);

  const toggleSymbols = useCallback(() => {
    setMode(prev => prev === 'SYMBOLS' ? 'UPPER' : 'SYMBOLS');
  }, []);

  const rows = mode === 'UPPER' ? QWERTY_UPPER : mode === 'LOWER' ? QWERTY_LOWER : SYMBOLS;

  return (
    <View style={s.container}>
      {/* Dynamic Key Rows */}
      <View style={s.keyboardGrid}>
        {/* ROW 1 */}
        <View style={s.row}>
          {rows[0].map(c => (
            <KeyButton key={c} label={c} onPress={() => handleChar(c)} />
          ))}
          <KeyButton isDelete onPress={handleBackspace} icon={<Delete size={20} color={Colors.white} />} />
        </View>

        {/* ROW 2 */}
        <View style={s.row}>
          {rows[1].map(c => (
            <KeyButton key={c} label={c} onPress={() => handleChar(c)} />
          ))}
          <KeyButton wide isAction onPress={handleSpace} icon={<Space size={20} color={Colors.white} />} label=" Espacio" />
        </View>

        {/* ROW 3 */}
        <View style={s.row}>
          <KeyButton 
            isAction 
            isActive={mode === 'UPPER' || mode === 'LOWER'}
            onPress={toggleCase} 
            icon={<ArrowUpCircle size={20} color={mode !== 'SYMBOLS' ? Colors.black : Colors.white} />} 
          />
          {rows[2].map(c => (
            <KeyButton key={c} label={c} onPress={() => handleChar(c)} />
          ))}
          <KeyButton 
            isAction 
            isActive={mode === 'SYMBOLS'}
            onPress={toggleSymbols} 
            icon={<Hash size={20} color={mode === 'SYMBOLS' ? Colors.black : Colors.white} />} 
          />
        </View>

        {/* ACTION ROW (Bottom) */}
        <View style={[s.row, { marginTop: 8 }]}>
          <KeyButton
            label="BORRAR TODO"
            wide
            isDelete
            onPress={handleClear}
            icon={<X size={18} color="#EF4444" />}
          />
          {onSubmit && (
            <KeyButton
              label="LISTO"
              wide
              isAction
              onPress={onSubmit}
              icon={<CornerDownLeft size={18} color={Colors.black} />}
              isActive={true} // Primary call to action style
            />
          )}
          {onClose && (
            <KeyButton
              label="CERRAR"
              wide
              isAction
              onPress={onClose}
            />
          )}
        </View>
      </View>
    </View>
  );
}

export default memo(TVKeyboard);

const KEY_SIZE = TV.keyboardKeySize || 44;
const KEY_GAP = TV.keyboardKeyGap || 8;

const s = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  keyboardGrid: {
    gap: KEY_GAP,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: KEY_GAP,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  keyWide: {
    width: KEY_SIZE * 3 + KEY_GAP * 2,
    paddingHorizontal: 12,
  },
  keyDelete: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  keyAction: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  keyActive: {
    backgroundColor: Colors.white,
  },
  keyFocused: {
    borderColor: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ scale: 1.1 }],
    zIndex: 10,
  },
  keyLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  keyLabelFocused: {
    color: Colors.black, // High contrast text on white focus/active background
  },
});
