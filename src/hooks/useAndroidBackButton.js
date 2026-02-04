import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useAndroidBackButton(onBack, enabled = true) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    if (!enabled) {
      return;
    }

    const handleBackButton = (event) => {
      if (onBack && typeof onBack === 'function') {
        onBack();
      }
    };

    const listener = App.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [onBack, enabled]);
}
