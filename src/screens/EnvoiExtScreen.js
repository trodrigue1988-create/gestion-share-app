import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import SoldeCard from '../components/SoldeCard';
import FilterBar, { applyFilter } from '../components/FilterBar';
import TxList from '../components/TxList';
import OpModal from '../components/OpModal';
import { COLORS, fmtMontant, calcSolde } from '../storage/utils';

export default function EnvoiExtScreen() {
  const { state, dispatch } = useContext(AppContext);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);

  const devise = state.devise || 'FCFA';
  const txs = state.cam;
  const filtered = applyFilter(txs, filter);
  const solde = calcSolde(txs);
  const totalIn = txs.filter(t => t.plus).reduce((s, t) => s + t.amount, 0);
  const totalOut = txs.filter(t => !t.plus).reduce((s, t) => s + t.amount, 0);

  function openModal(type) {
    setModal(type === 'depot'
      ? { title: 'Dépôt reçu', isPlus: true }
      : { title: 'Envoi effectué', isPlus: false });
  }

  function handleSave(montant, remarque) {
    const base = modal.title;
    dispatch({
      type: 'ADD_TX', mod: 'cam',
      tx: { label: remarque ? `${base} — ${remarque}` : base, amount: montant, plus: modal.isPlus, ts: Date.now() }
    });
    setModal(null);
  }

  function handleDelete(ts) {
    Alert.alert('Supprimer', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_TX', mod: 'cam', ts }) }
    ]);
  }

  return (
    <View style={s.container}>
      <ScrollView>
        <SoldeCard
          label="Solde Envoi Extérieur"
          solde={solde}
          icon="send-outline"
          iconColor={COLORS.info}
          leftLabel="Dépôts reçus" leftVal={'+' + fmtMontant(totalIn, devise)} leftColor={COLORS.info}
          rightLabel="Envois" rightVal={'-' + fmtMontant(totalOut, devise)} rightColor={COLORS.danger}
        />
        <FilterBar active={filter} onChange={setFilter} />
        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, { borderColor: COLORS.info + '60', backgroundColor: COLORS.infoBg }]} onPress={() => openModal('depot')}>
            <Ionicons name="cash" size={20} color={COLORS.info} />
            <Text style={[s.btnText, { color: COLORS.info }]}>Dépôt reçu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { borderColor: COLORS.warning + '60', backgroundColor: COLORS.warningBg }]} onPress={() => openModal('envoi')}>
            <Ionicons name="send" size={18} color={COLORS.warning} />
            <Text style={[s.btnText, { color: COLORS.warning }]}>Envoi effectué</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.sectionTitle}>Historique</Text>
        <TxList data={filtered} onDelete={handleDelete} />
      </ScrollView>
      <OpModal
        visible={!!modal}
        title={modal?.title || ''}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F3' },
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginBottom: 14 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: 14, borderWidth: 1 },
  btnText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginHorizontal: 14, marginBottom: 8 },
});
