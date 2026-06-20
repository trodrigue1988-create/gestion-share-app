import React, { useState, useEffect, useContext } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, fmtMontant } from '../storage/utils';
import { AppContext } from '../AppContext';

function ChipSelector({ items, selected, onSelect, onAddNew, addLabel = '+ Nouveau' }) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');

  function confirmNew() {
    const val = newText.trim();
    if (val) { onAddNew(val); onSelect(val); }
    setAdding(false);
    setNewText('');
  }

  return (
    <View>
      <View style={s.chips}>
        {items.map(item => (
          <TouchableOpacity
            key={item}
            style={[s.chip, selected === item && s.chipSelected]}
            onPress={() => onSelect(item)}
          >
            <Text style={[s.chipTxt, selected === item && s.chipTxtSelected]}>{item}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.chipAdd} onPress={() => setAdding(true)}>
          <Text style={s.chipAddTxt}>{addLabel}</Text>
        </TouchableOpacity>
      </View>
      {adding && (
        <View style={s.newRow}>
          <TextInput
            style={s.newInput}
            placeholder="Saisir..."
            placeholderTextColor={COLORS.textSecondary}
            value={newText}
            onChangeText={setNewText}
            autoFocus
            onSubmitEditing={confirmNew}
            returnKeyType="done"
          />
          <TouchableOpacity style={s.newConfirm} onPress={confirmNew}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.newCancel} onPress={() => { setAdding(false); setNewText(''); }}>
            <Ionicons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function EnvoiModal({ visible, onClose, onSave }) {
  const { state, dispatch } = useContext(AppContext);
  const [montant, setMontant] = useState('');
  const [destinataire, setDestinataire] = useState('');
  const [canal, setCanal] = useState('');
  const [frais, setFrais] = useState('');
  const [motif, setMotif] = useState('');

  useEffect(() => {
    if (visible) {
      setMontant(''); setDestinataire(''); setCanal('');
      setFrais(''); setMotif('');
    }
  }, [visible]);

  function handleSave() {
    const amt = parseFloat(montant.replace(/\s/g, '').replace(',', '.'));
    if (!amt || amt <= 0) return;
    if (!destinataire) return;
    onSave({
      amount: amt,
      destinataire: destinataire.trim(),
      canal: canal.trim() || 'Non renseigné',
      frais: parseFloat(frais.replace(/\s/g, '').replace(',', '.')) || 0,
      motif: motif.trim(),
      plus: false,
      ts: Date.now(),
    });
  }

  const canSave = parseFloat(montant) > 0 && destinataire.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={s.sheet}>
                <View style={s.handle} />

                <View style={s.header}>
                  <View style={[s.iconWrap, { backgroundColor: COLORS.info + '18' }]}>
                    <Ionicons name="send" size={20} color={COLORS.info} />
                  </View>
                  <Text style={s.title}>Nouvel envoi</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={s.label}>Montant *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.border}
                    keyboardType="numeric"
                    value={montant}
                    onChangeText={setMontant}
                    autoFocus
                  />

                  <Text style={s.label}>Destinataire *</Text>
                  <ChipSelector
                    items={state.destinatairesFrequents}
                    selected={destinataire}
                    onSelect={setDestinataire}
                    onAddNew={nom => dispatch({ type: 'ADD_DEST', nom })}
                  />

                  <Text style={s.label}>Canal de transfert</Text>
                  <ChipSelector
                    items={state.canauxFrequents}
                    selected={canal}
                    onSelect={setCanal}
                    onAddNew={nom => dispatch({ type: 'ADD_CANAL', nom })}
                  />

                  <Text style={s.label}>Frais (optionnel)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.border}
                    keyboardType="numeric"
                    value={frais}
                    onChangeText={setFrais}
                  />

                  <Text style={s.label}>Motif / remarque (optionnel)</Text>
                  <TextInput
                    style={[s.input, s.textarea]}
                    placeholder="Ex: loyer janvier, médicaments..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={motif}
                    onChangeText={setMotif}
                    multiline
                    numberOfLines={2}
                  />

                  <View style={s.actions}>
                    <TouchableOpacity style={s.btnCancel} onPress={onClose}>
                      <Text style={s.btnCancelTxt}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.btnConfirm, !canSave && { opacity: 0.4 }]}
                      onPress={handleSave}
                      disabled={!canSave}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={s.btnConfirmTxt}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
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
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, fontSize: 18, color: COLORS.textPrimary, marginBottom: 4, fontWeight: '600' },
  textarea: { fontSize: 14, fontWeight: '400', height: 64, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  chipSelected: { borderColor: COLORS.info, backgroundColor: COLORS.infoBg },
  chipTxt: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTxtSelected: { color: COLORS.info, fontWeight: '600' },
  chipAdd: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary + '60', backgroundColor: COLORS.successBg },
  chipAddTxt: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 4 },
  newInput: { flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: COLORS.textPrimary },
  newConfirm: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  newCancel: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  btnCancelTxt: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
  btnConfirm: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: COLORS.info, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  btnConfirmTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
