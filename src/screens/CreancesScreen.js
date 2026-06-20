import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import SoldeCard from '../components/SoldeCard';
import SegmentedTabs from '../components/SegmentedTabs';
import OpModal from '../components/OpModal';
import CreanceModal from '../components/CreanceModal';
import CreanceCard from '../components/CreanceCard';
import { COLORS, fmtMontant, calcCreanceRestant, isCreanceSolde } from '../storage/utils';

const TYPE_TABS = [
  { key: 'pret', label: 'Mes Prêts' },
  { key: 'dette', label: 'Mes Dettes' },
];

const STATUT_TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'encours', label: 'En cours' },
  { key: 'solde', label: 'Soldé' },
];

export default function CreancesScreen() {
  const { state, dispatch } = useContext(AppContext);
  const [type, setType] = useState('pret');
  const [statutFilter, setStatutFilter] = useState('all');
  const [newModal, setNewModal] = useState(false);
  const [rembTarget, setRembTarget] = useState(null);

  const devise = state.devise || 'FCFA';
  const all = state.creances || [];
  const prets = all.filter(c => c.type === 'pret');
  const dettes = all.filter(c => c.type === 'dette');

  const restantPrets = prets.reduce((s, c) => s + Math.max(calcCreanceRestant(c), 0), 0);
  const restantDettes = dettes.reduce((s, c) => s + Math.max(calcCreanceRestant(c), 0), 0);
  const net = restantPrets - restantDettes;

  const current = type === 'pret' ? prets : dettes;
  const filtered = statutFilter === 'all'
    ? current
    : current.filter(c => statutFilter === 'solde' ? isCreanceSolde(c) : !isCreanceSolde(c));

  const enCoursCount = current.filter(c => !isCreanceSolde(c)).length;
  const soldeCount = current.filter(c => isCreanceSolde(c)).length;

  function handleNewCreance(personne, montant, remarque) {
    dispatch({
      type: 'ADD_CREANCE',
      creance: { id: Date.now(), type, personne, montant, date: Date.now(), remarque, remboursements: [], cloture: false }
    });
    setNewModal(false);
  }

  function handleAddRemb(montant, remarque) {
    dispatch({ type: 'ADD_REMB', id: rembTarget.id, remb: { ts: Date.now(), montant, remarque } });
    setRembTarget(null);
  }

  function handleDelete(id) {
    Alert.alert('Supprimer', 'Confirmer la suppression de cette fiche ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_CREANCE', id }) }
    ]);
  }

  function handleDelRemb(id, ts) {
    dispatch({ type: 'DEL_REMB', id, ts });
  }

  function handleToggleCloture(id) {
    dispatch({ type: 'TOGGLE_CLOTURE', id });
  }

  return (
    <View style={s.container}>
      <ScrollView>
        <SoldeCard
          label="Net Créances"
          solde={net}
          leftLabel="À recevoir" leftVal={fmtMontant(restantPrets, devise)} leftColor={COLORS.success}
          rightLabel="À payer" rightVal={fmtMontant(restantDettes, devise)} rightColor={COLORS.danger}
          extra={{ label: 'Dossiers', val: String(all.length) }}
        />

        <SegmentedTabs tabs={TYPE_TABS} active={type} onChange={setType} />
        <SegmentedTabs tabs={STATUT_TABS} active={statutFilter} onChange={setStatutFilter} />

        <View style={s.statsRow}>
          <Text style={s.statsTxt}><Text style={{ color: COLORS.warning }}>{enCoursCount}</Text> en cours</Text>
          <Text style={s.statsTxt}><Text style={{ color: COLORS.success }}>{soldeCount}</Text> soldé(s)</Text>
        </View>

        <TouchableOpacity style={s.addBtn} onPress={() => setNewModal(true)}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
          <Text style={s.addBtnTxt}>{type === 'pret' ? 'Nouveau prêt accordé' : 'Nouvelle dette'}</Text>
        </TouchableOpacity>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={30} color={COLORS.border} />
            <Text style={s.emptyText}>Aucune {type === 'pret' ? 'créance' : 'dette'} ici</Text>
          </View>
        ) : (
          [...filtered].reverse().map(c => (
            <CreanceCard
              key={c.id}
              c={c}
              onAddRemb={(target) => setRembTarget(target)}
              onDelete={handleDelete}
              onToggleCloture={handleToggleCloture}
              onDelRemb={handleDelRemb}
            />
          ))
        )}
      </ScrollView>

      <CreanceModal
        visible={newModal}
        title={type === 'pret' ? 'Nouveau prêt accordé' : 'Nouvelle dette'}
        onClose={() => setNewModal(false)}
        onSave={handleNewCreance}
      />
      <OpModal
        visible={!!rembTarget}
        title={rembTarget ? `Remboursement — ${rembTarget.personne}` : ''}
        onClose={() => setRembTarget(null)}
        onSave={handleAddRemb}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 14, marginBottom: 10 },
  statsTxt: { fontSize: 12, color: COLORS.textSecondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 0.5, borderColor: COLORS.border, marginHorizontal: 14, marginBottom: 14 },
  addBtnTxt: { fontSize: 13, fontWeight: '500', color: COLORS.primary },
  empty: { alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8 },
});
