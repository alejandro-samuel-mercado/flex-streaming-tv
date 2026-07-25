import { useCallback } from 'react';
import { BackHandler, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useDoubleBackExit(onBeforeExit?: () => boolean) {
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (onBeforeExit && onBeforeExit()) {
                    return true; // We handled the back button (e.g. scrolled to top)! Do not show exit modal!
                }
                DeviceEventEmitter.emit('showExitAppModal');
                return true;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                backHandler.remove();
            };
        }, [onBeforeExit])
    );
}

export function useScrollToTopOnBack(onBeforeBack?: () => boolean) {
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (onBeforeBack && onBeforeBack()) {
                    return true; // We handled the back button by scrolling to top! Do not go back!
                }
                return false; // Let standard router.back() happen
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                backHandler.remove();
            };
        }, [onBeforeBack])
    );
}
