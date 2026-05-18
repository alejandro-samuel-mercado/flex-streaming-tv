import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal } from 'react-native';

const TVFocusGuide = (require('react-native') as any).TVFocusGuideView ?? View;

interface TVModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function TVModal({ visible, onClose, children }: TVModalProps) {
  // En TV, el modal nativo a veces pierde el foco hacia elementos de atrás.
  // Un TVFocusGuide alrededor del contenido ayuda a atrapar el foco.
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TVFocusGuide destinations={[]} style={s.guide}>
          {children}
        </TVFocusGuide>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
