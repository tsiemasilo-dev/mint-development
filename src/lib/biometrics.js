import { Capacitor } from '@capacitor/core';

const BIOMETRICS_ENABLED_KEY = 'biometricsEnabled';
const BIOMETRICS_USER_KEY = 'biometricsUserEmail';
const FIRST_LOGIN_KEY = 'hasLoggedInBefore';

export const isNativePlatform = () => {
  return typeof Capacitor.isNativePlatform === 'function'
    ? Capacitor.isNativePlatform()
    : Capacitor.getPlatform() !== 'web';
};

const loadNativeBiometric = async () => {
  if (!isNativePlatform()) return null;

  // Dynamic import so Vite web build never tries to resolve native deps
  const mod = await import('@capgo/capacitor-native-biometric');
  return mod.NativeBiometric || mod.default || mod;
};

export const isBiometricsAvailable = async () => {
  if (!isNativePlatform()) return { available: false, biometryType: null };

  try {
    const NativeBiometric = await loadNativeBiometric();
    if (!NativeBiometric) return { available: false, biometryType: null };

    const res = await NativeBiometric.isAvailable();
    return {
      available: !!res.isAvailable,
      biometryType: res.biometryType || null
    };
  } catch (error) {
    console.error('Error checking biometrics availability:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      error
    });
    return { available: false, biometryType: null };
  }
};

export const authenticateWithBiometrics = async (reason = 'Authenticate to continue') => {
  if (!isNativePlatform()) throw new Error('Biometrics only available on native platforms');

  try {
    const NativeBiometric = await loadNativeBiometric();
    if (!NativeBiometric) throw new Error('NativeBiometric not loaded');

    await NativeBiometric.verifyIdentity({ reason });
    return true;
  } catch (error) {
    console.error('Biometric authentication failed:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      error
    });
    throw error;
  }
};

export const isBiometricsEnabled = () => {
  return localStorage.getItem(BIOMETRICS_ENABLED_KEY) === 'true';
};

export const enableBiometrics = (userEmail) => {
  localStorage.setItem(BIOMETRICS_ENABLED_KEY, 'true');
  if (userEmail) localStorage.setItem(BIOMETRICS_USER_KEY, userEmail);
};

export const disableBiometrics = () => {
  localStorage.removeItem(BIOMETRICS_ENABLED_KEY);
  localStorage.removeItem(BIOMETRICS_USER_KEY);
};

export const getBiometricsUserEmail = () => {
  return localStorage.getItem(BIOMETRICS_USER_KEY);
};

export const isFirstLogin = (userEmail) => {
  const loginHistory = JSON.parse(localStorage.getItem(FIRST_LOGIN_KEY) || '{}');
  return !loginHistory[userEmail];
};

export const markAsLoggedIn = (userEmail) => {
  const loginHistory = JSON.parse(localStorage.getItem(FIRST_LOGIN_KEY) || '{}');
  loginHistory[userEmail] = true;
  localStorage.setItem(FIRST_LOGIN_KEY, JSON.stringify(loginHistory));
};

export const getBiometryTypeName = (biometryType) => {
  if (!biometryType) return 'Biometrics';
  const type = String(biometryType).toLowerCase();
  if (type.includes('face')) return 'Face ID';
  if (type.includes('touch') || type.includes('fingerprint')) return 'Touch ID';
  return 'Biometrics';
};
