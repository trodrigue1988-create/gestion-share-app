import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../storage/utils';
import { hasPin, setPin, verifyPin } from './authStorage';

const ONBOARDING_KEY = 'onboarding_vu';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
const PIN_LEN = 4;

export default function LockScreen({ onUnlock }) {
  const [mode, setMode] = useState('loading');
  const [pin, setPinInput] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    (async () => {
      const exists = await hasPin();
      if (exists) {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled);
        setMode('unlock');
      } else {
        const onboardingVu = await AsyncStorage.getItem(ONBOARDING_KEY);
        setMode(onboardingVu ? 'create' : 'onboarding');
      }
    })();
  }, []);

  useEffect(() => {
    if (mode === 'unlock' && biometricAvailable) tryBiometric();
  }, [mode, biometricAvailable]);

  async function tryBiometric() {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Déverrouiller GerèTout',
        cancelLabel: 'Annuler',
      });
      if (res.success) onUnlock();
    } catch (e) {
    } finally {
      setIsAuthenticating(false);
    }
  }

  useEffect(() => {
    if (pin.length !== PIN_LEN) return;
    if (mode === 'create') {
      setFirstPin(pin);
      setPinInput('');
      setMode('confirm');
    } else if (mode === 'confirm') {
      if (pin === firstPin) {
        setPin(pin).then(() => onUnlock());
      } else {
        setError('Les codes ne correspondent pas');
        setFirstPin('');
        setPinInput('');
        setMode('create');
      }
    } else if (mode === 'unlock') {
      verifyPin(pin).then(ok => {
        if (ok) { onUnlock(); } else { setError('Code incorrect'); setPinInput(''); }
      });
    }
  }, [pin]);

  function handleKey(k) {
    if (k === '') return;
    setError('');
    if (k === 'del') { setPinInput(p => p.slice(0, -1)); return; }
    setPinInput(p => (p + k).slice(0, PIN_LEN));
  }

  const title = mode === 'create' ? 'Crée ton code PIN'
    : mode === 'confirm' ? 'Confirme ton code PIN'
    : mode === 'unlock' ? 'Déverrouille l\'app'
    : '';

  const sub = mode === 'create' ? 'Protège l\'accès à tes données financières'
    : mode === 'confirm' ? 'Entre le même code pour confirmer'
    : mode === 'unlock' ? 'Entre ton code à 4 chiffres'
    : '';

  async function handleCommencer() {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setMode('create');
  }

  if (mode === 'loading') return <View style={s.container} />;

  if (mode === 'onboarding') {
    return (
      <View style={s.container}>
        <View style={s.onboardingLogoWrap}>
          <View style={s.onboardingLogoBg}>
            <Text style={s.onboardingLogoTxt}>G</Text>
          </View>
        </View>
        <Text style={s.onboardingTitle}>Bienvenue sur GerèTout</Text>
        <Text style={s.onboardingSub}>
          Gère tes dépenses, tes envois d'argent, tes créances et ton carburant, tout au même endroit.{'\n'}Tes données restent uniquement sur ton téléphone.
        </Text>
        <TouchableOpacity style={s.commencerBtn} onPress={handleCommencer} activeOpacity={0.8}>
          <Text style={s.commencerTxt}>Commencer</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Logo */}
      <View style={s.logoWrap}>
        <View style={s.logoBg}>
          <Ionicons name="lock-closed" size={32} color={COLORS.primary} />
        </View>
        <Text style={s.appName}>GerèTout</Text>
      </View>

      {/* Titre */}
      <Text style={s.title}>{title}</Text>
      <Text style={s.sub}>{sub}</Text>

      {/* Dots */}
      <View style={s.dotsRow}>
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <View key={i} style={[s.dot, pin.length > i && s.dotFilled]}>
            {pin.length > i && <View style={s.dotInner} />}
          </View>
        ))}
      </View>

      {/* Erreur */}
      {!!error && (
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
          <Text style={s.error}>{error}</Text>
        </View>
      )}

      {/* Clavier */}
      <View style={s.pad}>
        {KEYS.map((k, i) => (
          <TouchableOpacity
            key={i}
            style={[s.key, k === '' && s.keyHidden, k === 'del' && s.keyDel]}
            disabled={k === ''}
            onPress={() => handleKey(k)}
            activeOpacity={0.6}
          >
            {k === 'del' ? (
              <Ionicons name="backspace-outline" size={24} color={COLORS.textPrimary} />
            ) : k !== '' ? (
              <Text style={s.keyTxt}>{k}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Biométrie */}
      {mode === 'unlock' && biometricAvailable && (
        <TouchableOpacity
          style={[s.bioBtn, isAuthenticating && { opacity: 0.4 }]}
          onPress={tryBiometric}
          disabled={isAuthenticating}
        >
          <View style={s.bioBtnInner}>
            <Ionicons name="finger-print-outline" size={20} color={COLORS.primary} />
            <Text style={s.bioTxt}>Empreinte / Face ID</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8', alignItems: 'center', justifyContent: 'center', padding: 24 },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBg: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#B8DFCA' },
  appName: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.5 },

  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 28, maxWidth: 240, lineHeight: 18 },

  dotsRow: { flexDirection: 'row', gap: 18, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  dotFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },

  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  error: { fontSize: 13, color: COLORS.danger, fontWeight: '500' },

  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 270, justifyContent: 'center', marginTop: 12 },
  key: { width: 80, height: 72, alignItems: 'center', justifyContent: 'center', margin: 4 },
  keyHidden: { opacity: 0 },
  keyDel: {},
  keyTxt: { fontSize: 26, fontWeight: '400', color: COLORS.textPrimary },

  onboardingLogoWrap: { alignItems: 'center', marginBottom: 36 },
  onboardingLogoBg: { width: 110, height: 110, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  onboardingLogoTxt: { fontSize: 64, fontWeight: '800', color: '#fff', lineHeight: 76 },
  onboardingTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  onboardingSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 300, marginBottom: 48 },
  commencerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 28, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  commencerTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },

  bioBtn: { marginTop: 28 },
  bioBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#B8DFCA', backgroundColor: '#E8F5EE' },
  bioTxt: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
