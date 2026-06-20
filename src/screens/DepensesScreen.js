import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  Modal, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import SoldeCard from '../components/SoldeCard';
import FilterBar, { applyFilter } from '../components/FilterBar';
import TxList from '../components/TxList';
import OpModal from '../components/OpModal';
import { COLORS, fmtMontant, calcSolde } from '../storage/utils';

const CAT_ICONS = [
  'person-outline', 'home-outline', 'car-outline', 'restaurant-outline',
  'medkit-outline', 'school-outline', 'shirt-outline', 'game-controller-outline',
  'ellipsis-horizontal-circle-outline', 'briefcase-outline', 'phone-portrait-outline',
  'fitness-outline', 'cart-outline', 'airplane-outline', 'musical-notes-outline',
];
const CAT_COLORS = ['#3b82f6', '#f59e0b', '#9b59b6', '#22c55e', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

function thisMontFilter(txs) {
  const now = new Date();
  return txs.filter(t => {
    const d = new Date(t.ts);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

function MiniProgressBar({ pct }) {
  const over = pct > 1;
  const barColor = over ? COLORS.danger : pct >= 0.75 ? COLORS.warning : COLORS.success;
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: barColor }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height: 5, backgroundColor: COLORS.bg, borderRadius: 99, overflow: 'hidden', marginTop: 6, borderWidth: 0.5, borderColor: COLORS.border },
  fill: { height: '100%', borderRadius: 99 },
});

function RepartitionChart({ cats, moisDepByCat, devise }) {
  const total = cats.reduce((s, c) => s + (moisDepByCat[c.key] || 0), 0);
  if (total <= 0) return null;
  return (
    <View style={ch.wrap}>
      <Text style={ch.title}>Répartition ce mois</Text>
      <View style={ch.bar}>
        {cats.map(c => {
          const amt = moisDepByCat[c.key] || 0;
          if (amt <= 0) return null;
          return <View key={c.key} style={{ flex: amt / total, backgroundColor: c.color, height: '100%' }} />;
        })}
      </View>
      <View style={ch.legend}>
        {cats.filter(c => (moisDepByCat[c.key] || 0) > 0).map(c => {
          const pct = Math.round(((moisDepByCat[c.key] || 0) / total) * 100);
          return (
            <View key={c.key} style={ch.legendItem}>
              <View style={[ch.dot, { backgroundColor: c.color }]} />
              <Text style={ch.legendTxt}>
                {c.label}{' '}
                <Text style={{ color: c.color, fontWeight: '700' }}>{pct}%</Text>
              </Text>
              <Text style={ch.legendAmt}>{fmtMontant(moisDepByCat[c.key], devise)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const ch = StyleSheet.create({
  wrap: { marginHorizontal: 14, marginBottom: 14, padding: 14, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border },
  title: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  legend: { gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendTxt: { flex: 1, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' },
  legendAmt: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
});

export default function DepensesScreen() {
  const { state, dispatch } = useContext(AppContext);
  const devise = state.devise || 'FCFA';
  const cats = state.categoriesDepenses || [];
  const budgetsParCat = state.budgetsParCategorie || {};
  const allTxs = state.dep;

  const [cat, setCat] = useState(cats.length > 0 ? cats[0].key : 'perso');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState(CAT_ICONS[0]);
  const [newCatColor, setNewCatColor] = useState(CAT_COLORS[0]);
  const [renameText, setRenameText] = useState('');
  const [budgetInput, setBudgetInput] = useState('');

  // Si la catégorie active est supprimée, revenir à la première
  useEffect(() => {
    if (cats.length > 0 && !cats.find(c => c.key === cat)) {
      setCat(cats[0].key);
    }
  }, [cats]);

  const byCat = {};
  cats.forEach(t => { byCat[t.key] = allTxs.filter(tx => (tx.cat || 'perso') === t.key); });

  const soldeByCat = {};
  cats.forEach(t => { soldeByCat[t.key] = calcSolde(byCat[t.key] || []); });
  const soldeTotal = cats.reduce((s, t) => s + (soldeByCat[t.key] || 0), 0);

  const allThisMois = thisMontFilter(allTxs);
  const approMoisTotal = allThisMois.filter(t => t.plus).reduce((s, t) => s + t.amount, 0);
  const depMoisTotal = allThisMois.filter(t => !t.plus).reduce((s, t) => s + t.amount, 0);
  const soldeMoisTotal = approMoisTotal - depMoisTotal;

  const moisDepByCat = {};
  cats.forEach(c => {
    const m = thisMontFilter(byCat[c.key] || []);
    moisDepByCat[c.key] = m.filter(x => !x.plus).reduce((s, x) => s + x.amount, 0);
  });

  const activeCat = cats.find(t => t.key === cat) || cats[0];
  const currentTxs = byCat[cat] || [];
  const filtered = applyFilter(currentTxs, filter);
  const totalIn = currentTxs.filter(t => t.plus).reduce((s, t) => s + t.amount, 0);
  const totalOut = currentTxs.filter(t => !t.plus).reduce((s, t) => s + t.amount, 0);

  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const moisCap = mois.charAt(0).toUpperCase() + mois.slice(1);

  function handleLongPress(catObj) {
    Alert.alert(catObj.label, 'Que veux-tu faire ?', [
      {
        text: 'Renommer',
        onPress: () => { setRenameText(catObj.label); setModal({ type: 'renameCat', catKey: catObj.key }); },
      },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => {
          const hasTxs = allTxs.some(tx => (tx.cat || 'perso') === catObj.key);
          if (hasTxs) {
            Alert.alert('Impossible', `"${catObj.label}" contient des transactions. Supprime-les d'abord.`);
            return;
          }
          Alert.alert('Supprimer', `Supprimer "${catObj.label}" ?`, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_CATEGORIE', key: catObj.key }) },
          ]);
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function handleSaveOp(montant, remarque) {
    const base = modal.title;
    dispatch({
      type: 'ADD_TX', mod: 'dep',
      tx: { label: remarque ? `${base} — ${remarque}` : base, amount: montant, plus: modal.isPlus, ts: Date.now(), cat },
    });
    setModal(null);
  }

  function handleDelete(ts) {
    Alert.alert('Supprimer', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_TX', mod: 'dep', ts }) },
    ]);
  }

  function handleAddCat() {
    if (!newCatLabel.trim()) return;
    dispatch({ type: 'ADD_CATEGORIE', cat: { key: 'cat_' + Date.now(), label: newCatLabel.trim(), icon: newCatIcon, color: newCatColor } });
    setModal(null);
  }

  function handleRenameCat() {
    if (!renameText.trim()) return;
    dispatch({ type: 'EDIT_CATEGORIE', key: modal.catKey, changes: { label: renameText.trim() } });
    setModal(null);
  }

  function handleSaveBudget() {
    const val = parseFloat(budgetInput.replace(/\s/g, '').replace(',', '.'));
    if (!val || val <= 0) return;
    dispatch({ type: 'SET_BUDGET_CATEGORIE', catKey: modal.catKey, montant: val });
    setModal(null);
  }

  function openBudgetModal(catKey) {
    const existing = budgetsParCat[catKey];
    setBudgetInput(existing ? String(existing) : '');
    setModal({ type: 'budget', catKey });
  }

  const isAddCat = modal?.type === 'addCat';
  const isRenameCat = modal?.type === 'renameCat';
  const isBudgetModal = modal?.type === 'budget';
  const isCatModal = isAddCat || isRenameCat;

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SoldeCard
          label="Solde Dépenses (Total)"
          solde={soldeTotal}
          icon="receipt-outline"
          leftLabel="Entrées totales"
          leftVal={'+' + fmtMontant(allTxs.filter(t => t.plus).reduce((sum, t) => sum + t.amount, 0), devise)}
          leftColor={COLORS.success}
          rightLabel="Sorties totales"
          rightVal={'-' + fmtMontant(allTxs.filter(t => !t.plus).reduce((sum, t) => sum + t.amount, 0), devise)}
          rightColor={COLORS.danger}
        />

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

        <RepartitionChart cats={cats} moisDepByCat={moisDepByCat} devise={devise} />

        <Text style={s.sectionLabel}>Catégories</Text>
        <View style={s.catGrid}>
          {cats.map(t => {
            const budget = budgetsParCat[t.key];
            const depMois = moisDepByCat[t.key] || 0;
            const pct = budget > 0 ? depMois / budget : 0;
            const isActive = cat === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.catCard, isActive && s.catCardActive]}
                onPress={() => setCat(t.key)}
                onLongPress={() => handleLongPress(t)}
                delayLongPress={500}
                activeOpacity={0.8}
              >
                {isActive && <View style={[s.catActiveLine, { backgroundColor: t.color }]} />}
                <View style={s.catCardTop}>
                  <View style={[s.catIcon, { backgroundColor: t.color + '18' }]}>
                    <Ionicons name={t.icon} size={16} color={t.color} />
                  </View>
                  <TouchableOpacity
                    onPress={() => openBudgetModal(t.key)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={budget ? 'wallet' : 'wallet-outline'}
                      size={14}
                      color={budget ? t.color : COLORS.border}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[s.catLabel, isActive && { color: t.color }]}>{t.label}</Text>
                <Text style={s.catSoldeTotal}>{fmtMontant(soldeByCat[t.key] || 0, devise)}</Text>
                {budget > 0 ? (
                  <View>
                    <MiniProgressBar pct={pct} />
                    <Text style={[s.catBudgetTxt, { color: pct > 1 ? COLORS.danger : pct >= 0.75 ? COLORS.warning : COLORS.textSecondary }]}>
                      {fmtMontant(depMois, devise)} / {fmtMontant(budget, devise)}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.catHint}>Maintien appui pour options</Text>
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={s.addCatCard}
            onPress={() => { setNewCatLabel(''); setNewCatIcon(CAT_ICONS[0]); setNewCatColor(CAT_COLORS[0]); setModal({ type: 'addCat' }); }}
          >
            <View style={s.addCatIconWrap}>
              <Ionicons name="add" size={22} color={COLORS.primary} />
            </View>
            <Text style={s.addCatTxt}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {activeCat && (
          <>
            <View style={s.activeHeader}>
              <View style={[s.activeIconWrap, { backgroundColor: activeCat.color + '18' }]}>
                <Ionicons name={activeCat.icon} size={16} color={activeCat.color} />
              </View>
              <Text style={[s.activeTitle, { color: activeCat.color }]}>{activeCat.label}</Text>
              <View style={s.activeBadge}>
                <Text style={s.activeBadgeTxt}>{fmtMontant(soldeByCat[cat] || 0, devise)}</Text>
              </View>
            </View>

            <FilterBar active={filter} onChange={setFilter} />

            <View style={s.actions}>
              <TouchableOpacity
                style={[s.btn, s.btnAppro]}
                onPress={() => setModal({ type: 'op', title: 'Approvisionnement', isPlus: true })}
              >
                <Ionicons name="add-circle" size={20} color={COLORS.success} />
                <Text style={[s.btnText, { color: COLORS.success }]}>Approvisionner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnDep]}
                onPress={() => setModal({ type: 'op', title: 'Dépense', isPlus: false })}
              >
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
          </>
        )}
      </ScrollView>

      {/* Modal catégorie : ajouter ou renommer */}
      <Modal visible={isCatModal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <TouchableWithoutFeedback onPress={() => setModal(null)}>
          <View style={ms.overlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={ms.sheet}>
                  <View style={ms.handle} />
                  <Text style={ms.title}>{isAddCat ? 'Nouvelle catégorie' : 'Renommer'}</Text>

                  <Text style={ms.label}>Nom</Text>
                  <TextInput
                    style={ms.input}
                    placeholder="Ex: Santé, Transport..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={isAddCat ? newCatLabel : renameText}
                    onChangeText={isAddCat ? setNewCatLabel : setRenameText}
                    autoFocus
                  />

                  {isAddCat && (
                    <>
                      <Text style={ms.label}>Icône</Text>
                      <View style={ms.iconGrid}>
                        {CAT_ICONS.map(ic => (
                          <TouchableOpacity
                            key={ic}
                            style={[ms.iconChip, newCatIcon === ic && { backgroundColor: newCatColor + '25', borderColor: newCatColor }]}
                            onPress={() => setNewCatIcon(ic)}
                          >
                            <Ionicons name={ic} size={20} color={newCatIcon === ic ? newCatColor : COLORS.textSecondary} />
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={ms.label}>Couleur</Text>
                      <View style={ms.colorRow}>
                        {CAT_COLORS.map(c => (
                          <TouchableOpacity
                            key={c}
                            style={[ms.colorDot, { backgroundColor: c }, newCatColor === c && ms.colorDotSelected]}
                            onPress={() => setNewCatColor(c)}
                          />
                        ))}
                      </View>
                    </>
                  )}

                  <View style={ms.actions}>
                    <TouchableOpacity style={ms.btnCancel} onPress={() => setModal(null)}>
                      <Text style={ms.btnCancelTxt}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={ms.btnConfirm} onPress={isAddCat ? handleAddCat : handleRenameCat}>
                      <Text style={ms.btnConfirmTxt}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal budget par catégorie */}
      <Modal visible={isBudgetModal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <TouchableWithoutFeedback onPress={() => setModal(null)}>
          <View style={ms.overlayCenter}>
            <TouchableWithoutFeedback>
              <View style={ms.modalCenter}>
                <Text style={ms.title}>Budget — {cats.find(c => c.key === modal?.catKey)?.label}</Text>
                <Text style={ms.label}>Montant mensuel ({devise})</Text>
                <TextInput
                  style={ms.input}
                  placeholder="Ex: 50 000"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  autoFocus
                />
                <View style={ms.actions}>
                  <TouchableOpacity style={ms.btnCancel} onPress={() => setModal(null)}>
                    <Text style={ms.btnCancelTxt}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={ms.btnConfirm} onPress={handleSaveBudget}>
                    <Text style={ms.btnConfirmTxt}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <OpModal
        visible={modal?.type === 'op'}
        title={modal?.type === 'op' ? `${modal.title} — ${activeCat?.label || ''}` : ''}
        onClose={() => setModal(null)}
        onSave={handleSaveOp}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F3' },

  moisCard: { marginHorizontal: 14, marginBottom: 14, padding: 14, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border },
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
  catCard: { width: '47%', padding: 12, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  catCardActive: { borderColor: COLORS.primary + '60' },
  catCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  catActiveLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  catLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 3 },
  catSoldeTotal: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  catBudgetTxt: { fontSize: 10, fontWeight: '500', marginTop: 3 },
  catHint: { fontSize: 9, color: COLORS.border, marginTop: 4 },

  addCatCard: { width: '47%', padding: 12, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary + '40', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 80 },
  addCatIconWrap: { width: 36, height: 36, borderRadius: 11, backgroundColor: COLORS.successBg, alignItems: 'center', justifyContent: 'center' },
  addCatTxt: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

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

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12, paddingBottom: 32 },
  modalCenter: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, width: '100%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, fontSize: 16, color: COLORS.textPrimary, marginBottom: 8, fontWeight: '600' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  iconChip: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: COLORS.textPrimary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  btnCancelTxt: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
  btnConfirm: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center' },
  btnConfirmTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
