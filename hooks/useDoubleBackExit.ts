import { useCallback } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';
import { useFocusEffect } from 'expo-router';

let currentCount = 0;

export function useDoubleBackExit() {
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (currentCount === 0) {
                    currentCount = 1;
                    ToastAndroid.show('Presiona atrás nuevamente para salir', ToastAndroid.SHORT);
                    setTimeout(() => {
                        currentCount = 0;
                    }, 2000);
                    return true;
                } else {
                    BackHandler.exitApp();
                    return true;
                }
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                currentCount = 0;
                backHandler.remove();
            };
        }, [])
    );
}
