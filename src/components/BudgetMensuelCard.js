import React, { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, TouchableWithoutFeedback,
} from 'react-native';
import useKeyboardHeight from '../hooks/useKeyboardHeight';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, fmtMontant } from '../storage/utils';
import { AppContext } from '../AppContext';

function ProgressBar({ pct }) {
  const clamped = Math.min(pct, 1);
  const over = pct > 1;
  const barColor = over
    ? COLORS.danger
    : pct >= 0.75
    ? COLORS.warning
    : COLORS.success;

  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${Math.min(clamped * 100, 100)}%`, backgroundColor: barColor }]} />
      {over && (
        <View style={[pb.fill, { position: 'absolute', left: 0, top: 0, width: '100%', backgroundColor: COLORS.dangerBg, zIndex: -1 }]} />
      )}
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: COLORS.bg, borderRadius: 99, overflow: 'hidden', borderWidth: 0.5, borderColor: COLORS.border },
  fill: { height: '100%', borderRadius: 99 },
});

export default function BudgetMensuelCard({ budgetMensuel, depenseCeMois, onSet }) {
  const [modal, setModal] = useState(false);
  const [input, setInput] = useState('');
  const { state } = useContext(AppContext);
  const keyboardHeight = useKeyboardHeight();
  const devise = state.devise || 'FCFA';

  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const moisCapital = mois.charAt(0).toUpperCase() + mois.slice(1);

  const hasBudget = budgetMensuel > 0;
  const pct = hasBudget ? depenseCeMois / budgetMensuel : 0;
  const restant = budgetMensuel - depenseCeMois;
  const over = restant < 0;

  const statusColor = over ? COLORS.danger : pct >= 0.75 ? COLORS.warning : COLORS.success;
  const statusBg = over ? COLORS.dangerBg : pct >= 0.75 ? COLORS.warningBg : COLORS.successBg;
  const statusIcon = over ? 'warning-outline' : pct >= 0.75 ? 'alert-circle-outline' : 'checkmark-circle-outline';
  const statusMsg = over
    ? `Dépassé de ${fmtMontant(Math.abs(restant), devise)}`
    : pct >= 0.75
    ? `Plus que ${fmtMontant(restant, devise)} restant`
    : `${fmtMontant(restant, devise)} restant`;

  function handleSave() {
    const val = parseFloat(input.replace(/\s/g, '').replace(',', '.'));
    if (!val || val <= 0) return;
    onSet(val);
    setModal(false);
    setInput('');
  }

  return (
    <>
      <TouchableOpacity
        style={s.card}
        onPress={() => { setInput(budgetMensuel > 0 ? String(budgetMensuel) : ''); setModal(true); }}
        activeOpacity={0.85}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={[s.iconWrap, { backgroundColor: '#E8F5EE' }]}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={s.title}>Budget mensuel</Text>
              <Text style={s.subtitle}>{moisCapital}</Text>
            </View>
          </View>
          <View style={s.editChip}>
            <Ionicons name="pencil-outline" size={12} color={COLORS.textSecondary} />
            <Text style={s.editTxt}>{hasBudget ? 'Modifier' : 'Définir'}</Text>
          </View>
        </View>

        {hasBudget ? (
          <>
            {/* Montants */}
            <View style={s.amounts}>
              <View>
                <Text style={s.amtVal}>{fmtMontant(depenseCeMois, devise)}</Text>
                <Text style={s.amtLbl}>Dépensé ce mois</Text>
              </View>
              <View style={s.divider} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.amtVal, { color: COLORS.textSecondary }]}>{fmtMontant(budgetMensuel, devise)}</Text>
                <Text style={s.amtLbl}>Budget défini</Text>
              </View>
            </View>

            {/* Barre */}
            <ProgressBar pct={pct} />

            {/* Pourcentage + statut */}
            <View style={s.statusRow}>
              <View style={[s.statusChip, { backgroundColor: statusBg }]}>
                <Ionicons name={statusIcon} size={13} color={statusColor} />
                <Text style={[s.statusTxt, { color: statusColor }]}>{statusMsg}</Text>
              </View>
              <Text style={[s.pctTxt, { color: statusColor }]}>{Math.round(pct * 100)}%</Text>
            </View>
          </>
        ) : (
          <View style={s.empty}>
            <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
            <Text style={s.emptyTxt}>Appuie pour définir ton budget mensuel</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal saisie budget */}
      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <TouchableWithoutFeedback onPress={() => setModal(false)}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={[s.modal, { marginBottom: keyboardHeight > 0 ? keyboardHeight - 24 : 0 }]}>
                <View style={s.modalHeader}>
                  <View style={[s.iconWrap, { backgroundColor: '#E8F5EE', width: 40, height: 40 }]}>
                    <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={s.modalTitle}>Budget mensuel</Text>
                    <Text style={s.modalSub}>{moisCapital}</Text>
                  </View>
                </View>

                <Text style={s.label}>Montant du budget ({devise})</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ex : 50 000"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={input}
                  onChangeText={setInput}
                  autoFocus
                />

                <View style={s.mActions}>
                  <TouchableOpacity style={s.btnCancel} onPress={() => setModal(false)}>
                    <Text style={{ color: COLORS.textSecondary, fontWeight: '500' }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnConfirm} onPress={handleSave}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border },
  editTxt: { fontSize: 11, color: COLORS.textSecondary },
  amounts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  amtVal: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  amtLbl: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: COLORS.border },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusTxt: { fontSize: 12, fontWeight: '500' },
  pctTxt: { fontSize: 13, fontWeight: '700' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  emptyTxt: { fontSize: 13, color: COLORS.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  modalSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.bg, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.textPrimary, marginBottom: 20, fontWeight: '600' },
  mActions: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center' },
  btnConfirm: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
});
