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
  { key: 'perso', label: 'Perso', icon: 'person-outline', color: COLORS.info },
  { key: 'chargesFixes', label: 'Charg Fix', icon: 'home-outline', color: COLORS.warning },
  { key: 'autres', label: 'Autres', icon: 'ellipsis-horizontal-circle-outline', color: '#9b59b6' },
];

function thisMontFilter(txs) {
  const now = new Date();
  return txs.filter(t => {
    const d = new Date(t.ts);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

export default function DepensesScreen() {
  const { state, dispatch } = useContext(AppContext);
  const [cat, setCat] = useState('perso');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);

  const devise = state.devise || 'FCFA';
  const allTxs = state.dep;
  const byCat = {};
  CAT_TABS.forEach(t => { byCat[t.key] = allTxs.filter(tx => (tx.cat || 'perso') === t.key); });

  const soldeByCat = {};
  CAT_TABS.forEach(t => { soldeByCat[t.key] = calcSolde(byCat[t.key]); });
  const soldeTotal = CAT_TABS.reduce((s, t) => s + soldeByCat[t.key], 0);

  // Mensuel global
  const allThisMois = thisMontFilter(allTxs);
  const approMoisTotal = allThisMois.filter(t => t.plus).reduce((s, t) => s + t.amount, 0);
  const depMoisTotal = allThisMois.filter(t => !t.plus).reduce((s, t) => s + t.amount, 0);
  const soldeMoisTotal = approMoisTotal - depMoisTotal;

  // Mensuel par cat
  const moisByCat = {};
  CAT_TABS.forEach(t => {
    const m = thisMontFilter(byCat[t.key]);
    moisByCat[t.key] = {
      appro: m.filter(x => x.plus).reduce((s, x) => s + x.amount, 0),
      solde: calcSolde(m),
    };
  });

  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const moisCap = mois.charAt(0).toUpperCase() + mois.slice(1);

  const currentTxs = byCat[cat];
  const filtered = applyFilter(currentTxs, filter);
  const totalIn = currentTxs.filter(t => t.plus).reduce((s, t) => s + t.amount, 0);
  const totalOut = currentTxs.filter(t => !t.plus).reduce((s, t) => s + t.amount, 0);
  const activeCat = CAT_TABS.find(t => t.key === cat);

  function openModal(type) {
    setModal(type === 'appro'
      ? { title: 'Approvisionnement', isPlus: true }
      : { title: 'Dépense', isPlus: false });
  }

  function handleSave(montant, remarque) {
    const base = modal.title;
    dispatch({
      type: 'ADD_TX', mod: 'dep',
      tx: { label: remarque ? `${base} — ${remarque}` : base, amount: montant, plus: modal.isPlus, ts: Date.now(), cat }
    });
    setModal(null);
  }

  function handleDelete(ts) {
    Alert.alert('Supprimer', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_TX', mod: 'dep', ts }) }
    ]);
  }

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Solde total global */}
        <SoldeCard
          label="Solde Dépenses (Total)"
          solde={soldeTotal}
          icon="receipt-outline"
          leftLabel="Entrées totales" leftVal={'+' + fmtMontant(allTxs.filter(t => t.plus).reduce((s, t) => s + t.amount, 0), devise)} leftColor={COLORS.success}
          rightLabel="Sorties totales" rightVal={'-' + fmtMontant(allTxs.filter(t => !t.plus).reduce((s, t) => s + t.amount, 0), devise)} rightColor={COLORS.danger}
        />

        {/* Carte mensuelle globale */}
        <View style={s.moisCard}>
          <View style={s.moisHeader}>
            <View style={s.moisIconWrap}>
              <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
            </View>
            <Text style={s.moisTitle}>Ce mois — {moisCap}</Text>
          </View>
          <View style={s.moisRow}>
            <View style={s.moisStat}>
              <Text style={s.moisStatLbl}>Appro. total</Text>
              <Text style={[s.moisStatVal, { color: COLORS.success }]}>+{fmtMontant(approMoisTotal, devise)}</Text>
            </View>
            <View style={s.moisDivider} />
            <View style={s.moisStat}>
              <Text style={s.moisStatLbl}>Dépenses</Text>
              <Text style={[s.moisStatVal, { color: COLORS.danger }]}>-{fmtMontant(depMoisTotal, devise)}</Text>
            </View>
            <View style={s.moisDivider} />
            <View style={s.moisStat}>
              <Text style={s.moisStatLbl}>Solde mois</Text>
              <Text style={[s.moisStatVal, { color: soldeMoisTotal >= 0 ? COLORS.info : COLORS.danger }]}>
                {soldeMoisTotal >= 0 ? '+' : ''}{fmtMontant(soldeMoisTotal, devise)}
              </Text>
            </View>
          </View>
        </View>

        {/* Grille des 4 modules */}
        <Text style={s.sectionLabel}>Modules</Text>
        <View style={s.catGrid}>
          {CAT_TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.catCard, cat === t.key && s.catCardActive]}
              onPress={() => setCat(t.key)}
              activeOpacity={0.8}
            >
              <View style={[s.catIcon, { backgroundColor: t.color + '18' }]}>
                <Ionicons name={t.icon} size={16} color={t.color} />
              </View>
              <Text style={[s.catLabel, cat === t.key && { color: t.color }]}>{t.label}</Text>
              <Text style={s.catSoldeTotal}>{fmtMontant(soldeByCat[t.key], devise)}</Text>
              <View style={s.catMoisRow}>
                <Text style={s.catMoisLbl}>Appro mois</Text>
                <Text style={[s.catMoisVal, { color: COLORS.success }]}>+{fmtMontant(moisByCat[t.key].appro, devise)}</Text>
              </View>
              <View style={s.catMoisRow}>
                <Text style={s.catMoisLbl}>Solde mois</Text>
                <Text style={[s.catMoisVal, { color: moisByCat[t.key].solde >= 0 ? COLORS.info : COLORS.danger }]}>
                  {moisByCat[t.key].solde >= 0 ? '+' : ''}{fmtMontant(moisByCat[t.key].solde, devise)}
                </Text>
              </View>
              {cat === t.key && <View style={[s.catActiveLine, { backgroundColor: t.color }]} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Section active */}
        <View style={s.activeHeader}>
          <View style={[s.activeIconWrap, { backgroundColor: activeCat.color + '18' }]}>
            <Ionicons name={activeCat.icon} size={16} color={activeCat.color} />
          </View>
          <Text style={[s.activeTitle, { color: activeCat.color }]}>{activeCat.label}</Text>
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeTxt}>{fmtMontant(soldeByCat[cat], devise)}</Text>
          </View>
        </View>

        <FilterBar active={filter} onChange={setFilter} />

        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, s.btnAppro]} onPress={() => openModal('appro')}>
            <Ionicons name="add-circle" size={20} color={COLORS.success} />
            <Text style={[s.btnText, { color: COLORS.success }]}>Approvisionner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnDep]} onPress={() => openModal('depense')}>
            <Ionicons name="remove-circle" size={20} color={COLORS.danger} />
            <Text style={[s.btnText, { color: COLORS.danger }]}>Dépense</Text>
          </TouchableOpacity>
        </View>

        <View style={s.histHeader}>
          <Text style={s.histTitle}>Historique — {activeCat.label}</Text>
          <Text style={s.histStats}>
            <Text style={{ color: COLORS.success }}>+{fmtMontant(totalIn, devise)}</Text>
            {'  '}
            <Text style={{ color: COLORS.danger }}>-{fmtMontant(totalOut, devise)}</Text>
          </Text>
        </View>

        <TxList data={filtered} onDelete={handleDelete} />
      </ScrollView>

      <OpModal
        visible={!!modal}
        title={modal?.title ? `${modal.title} — ${activeCat.label}` : ''}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F3' },

  moisCard: { marginHorizontal: 14, marginBottom: 14, padding: 14, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  moisHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  moisIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
  moisTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  moisRow: { flexDirection: 'row', alignItems: 'center' },
  moisStat: { flex: 1, alignItems: 'center' },
  moisStatLbl: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 3 },
  moisStatVal: { fontSize: 13, fontWeight: '700' },
  moisDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  sectionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 14, marginBottom: 8 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 14, marginBottom: 16 },
  catCard: { width: '47%', padding: 12, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1, overflow: 'hidden' },
  catCardActive: { borderColor: COLORS.primary + '60', shadowColor: COLORS.primary, shadowOpacity: 0.12, elevation: 3 },
  catIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  catSoldeTotal: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  catMoisRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  catMoisLbl: { fontSize: 10, color: COLORS.textSecondary },
  catMoisVal: { fontSize: 11, fontWeight: '600' },
  catActiveLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },

  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 10 },
  activeIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activeTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 0.5, borderColor: COLORS.border },
  activeBadgeTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },

  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginBottom: 14 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: 14, borderWidth: 1 },
  btnAppro: { borderColor: COLORS.success + '50', backgroundColor: COLORS.successBg },
  btnDep: { borderColor: COLORS.danger + '50', backgroundColor: COLORS.dangerBg },
  btnText: { fontSize: 13, fontWeight: '600' },

  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 14, marginBottom: 8 },
  histTitle: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  histStats: { fontSize: 11, fontWeight: '500' },
});
