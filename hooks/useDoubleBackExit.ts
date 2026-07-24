import { useCallback } from 'react';
import { BackHandler, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useDoubleBackExit() {
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                DeviceEventEmitter.emit('showExitAppModal');
                return true;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                backHandler.remove();
            };
        }, [])
    );
}
