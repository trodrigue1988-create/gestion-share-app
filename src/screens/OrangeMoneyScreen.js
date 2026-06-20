import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import SoldeCard from '../components/SoldeCard';
import SegmentedTabs from '../components/SegmentedTabs';
import FilterBar, { applyFilter } from '../components/FilterBar';
import TxList from '../components/TxList';
import OpModal from '../components/OpModal';
import { COLORS, fmtMontant, calcSolde } from '../storage/utils';

const CAT_TABS = [
  { key: 'business', label: 'Business' },
  { key: 'perso', label: 'Perso' },
];

export default function OrangeMoneyScreen() {
  const { state, dispatch } = useContext(AppContext);
  const [cat, setCat] = useState('business');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);

  const allTxs = state.om;
  const businessTxs = allTxs.filter(t => (t.cat || 'business') === 'business');
  const persoTxs = allTxs.filter(t => (t.cat || 'business') === 'perso');
  const soldeBusiness = calcSolde(businessTxs);
  const soldePerso = calcSolde(persoTxs);
  const soldeTotal = soldeBusiness + soldePerso;

  const currentTxs = cat === 'business' ? businessTxs : persoTxs;
  const filtered = applyFilter(currentTxs, filter);
  const totalIn = currentTxs.filter(t => t.plus).reduce((s, t) => s + t.amount, 0);
  const totalOut = currentTxs.filter(t => !t.plus).reduce((s, t) => s + t.amount, 0);

  function openModal(type) {
    setModal(type === 'entree'
      ? { title: 'Entrée reçue', isPlus: true }
      : { title: 'Envoi effectué', isPlus: false });
  }

  function handleSave(montant, remarque) {
    const base = modal.title;
    dispatch({
      type: 'ADD_TX', mod: 'om',
      tx: { label: remarque ? `${base} — ${remarque}` : base, amount: montant, plus: modal.isPlus, ts: Date.now(), cat }
    });
    setModal(null);
  }

  function handleDelete(ts) {
    Alert.alert('Supprimer', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_TX', mod: 'om', ts }) }
    ]);
  }

  return (
    <View style={s.container}>
      <ScrollView>
        <SoldeCard
          label="Solde Orange Money (Total)"
          solde={soldeTotal}
          icon="phone-portrait-outline"
          iconColor={COLORS.primary}
          leftLabel="Business" leftVal={fmtMontant(soldeBusiness)} leftColor={COLORS.primary}
          rightLabel="Perso" rightVal={fmtMontant(soldePerso)} rightColor={COLORS.info}
        />
        <SegmentedTabs tabs={CAT_TABS} active={cat} onChange={setCat} />
        <FilterBar active={filter} onChange={setFilter} />
        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, { borderColor: COLORS.success + '60', backgroundColor: COLORS.successBg }]} onPress={() => openModal('entree')}>
            <Ionicons name="arrow-down-circle" size={20} color={COLORS.success} />
            <Text style={[s.btnText, { color: COLORS.success }]}>Entrée reçue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { borderColor: COLORS.danger + '60', backgroundColor: COLORS.dangerBg }]} onPress={() => openModal('sortie')}>
            <Ionicons name="arrow-up-circle" size={20} color={COLORS.danger} />
            <Text style={[s.btnText, { color: COLORS.danger }]}>Envoi fait</Text>
          </TouchableOpacity>
        </View>
        <View style={s.subRow}>
          <Text style={s.sectionTitle}>Historique — {cat === 'business' ? 'Business' : 'Perso'}</Text>
          <Text style={s.subStats}>
            <Text style={{ color: COLORS.success }}>+{fmtMontant(totalIn)}</Text>
            {'  '}
            <Text style={{ color: COLORS.danger }}>-{fmtMontant(totalOut)}</Text>
          </Text>
        </View>
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
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 14, marginBottom: 8 },
  sectionTitle: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  subStats: { fontSize: 11, fontWeight: '500' },
});
