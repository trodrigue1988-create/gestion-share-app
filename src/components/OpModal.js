import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, fmtMontant } from '../storage/utils';

export default function OpModal({ visible, title, onClose, onSave, prixLitre, isFuel }) {
  const [montant, setMontant] = useState('');
  const [remarque, setRemarque] = useState('');

  useEffect(() => {
    if (visible) { setMontant(''); setRemarque(''); }
  }, [visible]);

  const litresPreview = isFuel && prixLitre > 0 && parseFloat(montant) > 0
    ? (parseFloat(montant) / prixLitre).toFixed(2)
    : null;

  function handleSave() {
    const amt = parseFloat(montant.replace(/\s/g, '').replace(',', '.'));
    if (!amt || amt <= 0) return;
    onSave(amt, remarque.trim());
  }

  const isPlus = title && (title.toLowerCase().includes('entrée') || title.toLowerCase().includes('appro') || title.toLowerCase().includes('ravit') || title.toLowerCase().includes('budget'));
  const iconName = isPlus ? 'arrow-down-circle' : 'arrow-up-circle';
  const iconColor = isPlus ? COLORS.success : COLORS.danger;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={s.sheet}>
                <View style={s.handle} />

                <View style={s.header}>
                  <View style={[s.iconWrap, { backgroundColor: iconColor + '18' }]}>
                    <Ionicons name={iconName} size={22} color={iconColor} />
                  </View>
                  <Text style={s.title}>{title}</Text>
                </View>

                <Text style={s.label}>Montant (FCFA)</Text>
                <TextInput
                  style={s.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.border}
                  keyboardType="numeric"
                  value={montant}
                  onChangeText={setMontant}
                  autoFocus
                />

                {litresPreview && (
                  <View style={s.preview}>
                    <Ionicons name="information-circle-outline" size={14} color={COLORS.info} />
                    <Text style={s.previewText}>{litresPreview} litres à {fmtMontant(prixLitre)}/L</Text>
                  </View>
                )}

                <Text style={s.label}>Remarque (optionnel)</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  placeholder="Ex: Envoi à Mama, achat vivres..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={remarque}
                  onChangeText={setRemarque}
                  multiline
                  numberOfLines={2}
                />

                <View style={s.actions}>
                  <TouchableOpacity style={s.btnCancel} onPress={onClose}>
                    <Text style={s.btnCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btnConfirm, { backgroundColor: iconColor }]}
                    onPress={handleSave}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={s.btnConfirmText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, fontSize: 18, color: COLORS.textPrimary, marginBottom: 8, fontWeight: '600' },
  textarea: { fontSize: 14, fontWeight: '400', height: 64, textAlignVertical: 'top' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.infoBg, borderRadius: 10, padding: 10, marginBottom: 10 },
  previewText: { fontSize: 12, color: COLORS.info, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  btnCancelText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
  btnConfirm: { flex: 2, padding: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  btnConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
