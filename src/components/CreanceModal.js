import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback
} from 'react-native';
import { COLORS } from '../storage/utils';

export default function CreanceModal({ visible, title, onClose, onSave }) {
  const [personne, setPersonne] = useState('');
  const [montant, setMontant] = useState('');
  const [remarque, setRemarque] = useState('');

  useEffect(() => {
    if (visible) { setPersonne(''); setMontant(''); setRemarque(''); }
  }, [visible]);

  function handleSave() {
    const amt = parseFloat(montant);
    if (!personne.trim() || !amt || amt <= 0) return;
    onSave(personne.trim(), amt, remarque.trim());
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={s.modal}>
                <Text style={s.title}>{title}</Text>

                <Text style={s.label}>Personne</Text>
                <TextInput
                  style={s.input}
                  placeholder="Nom de la personne"
                  placeholderTextColor={COLORS.textSecondary}
                  value={personne}
                  onChangeText={setPersonne}
                  autoFocus
                />

                <Text style={s.label}>Montant (FCFA)</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ex: 50 000"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={montant}
                  onChangeText={setMontant}
                />

                <Text style={s.label}>Remarque (optionnel)</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  placeholder="Ex: prêt pour..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={remarque}
                  onChangeText={setRemarque}
                  multiline
                  numberOfLines={3}
                />

                <View style={s.actions}>
                  <TouchableOpacity style={s.btnCancel} onPress={onClose}>
                    <Text style={s.btnCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnConfirm} onPress={handleSave}>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  input: { backgroundColor: COLORS.bg, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.textPrimary, marginBottom: 12 },
  textarea: { height: 70, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center' },
  btnCancelText: { color: COLORS.textSecondary, fontSize: 14 },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  btnConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
