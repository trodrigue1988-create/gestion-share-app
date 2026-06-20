import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PIN_KEY = 'gestion_app_pin_hash_v1';

async function hashPin(pin) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function hasPin() {
  const v = await AsyncStorage.getItem(PIN_KEY);
  return !!v;
}

export async function setPin(pin) {
  const hash = await hashPin(pin);
  await AsyncStorage.setItem(PIN_KEY, hash);
}

export async function verifyPin(pin) {
  const stored = await AsyncStorage.getItem(PIN_KEY);
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

export async function clearPin() {
  await AsyncStorage.removeItem(PIN_KEY);
}
