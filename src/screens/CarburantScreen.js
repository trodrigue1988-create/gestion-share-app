import React, { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Modal, TextInput, Image, ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { AppContext, VEHICULE_DEFAUT_ID } from '../AppContext';
import { AuthContext } from '../auth/AuthContext';
import SoldeCard from '../components/SoldeCard';
import FilterBar, { applyFilter } from '../components/FilterBar';
import TxList from '../components/TxList';
import OpModal from '../components/OpModal';
import BudgetMensuelCard from '../components/BudgetMensuelCard';
import { COLORS, fmtMontant, fmtLitres, calcSolde } from '../storage/utils';
import useKeyboardHeight from '../hooks/useKeyboardHeight';

const MI_TO_KM = 1.60934;

function extractKmFromText(text) {
  const isMiles = /\bmi\b/i.test(text) && !/\bkm\b/i.test(text);
  const matches = text.match(/\d[\d ,.]{1,8}\d|\d{3,7}/g) || [];
  let candidate = null;
  let maxDigits = 0;
  for (const m of matches) {
    const digits = m.replace(/\D/g, '');
    if (digits.length >= 3 && digits.length <= 7 && digits.length > maxDigits) {
      maxDigits = digits.length;
      candidate = digits;
    }
  }
  if (!candidate) return null;
  let km = parseInt(candidate, 10);
  if (isMiles) km = Math.round(km * MI_TO_KM);
  return { km, isMiles };
}

// Calcule la conso L/100 entre chaque paire de pleins consécutifs avec km
function calcEvolutionL100(cons) {
  const withKm = [...cons].filter(t => t.km).sort((a, b) => a.ts - b.ts);
  const points = [];
  for (let i = 1; i < withKm.length; i++) {
    const prev = withKm[i - 1];
    const curr = withKm[i];
    const deltaKm = curr.km - prev.km;
    if (deltaKm <= 0 || !curr.litres) continue;
    points.push({
      ts: curr.ts,
      km: curr.km,
      l100: (curr.litres / deltaKm) * 100,
    });
  }
  return points;
}

function L100Chart({ cons, devise }) {
  const points = calcEvolutionL100(cons);
  if (points.length < 1) return null;

  const recent = points.slice(-8); // max 8 derniers pleins
  const values = recent.map(p => p.l100);
  const maxVal = Math.max(...values, 1);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  let tendance = null;
  if (points.length >= 2) {
    const last = points[points.length - 1].l100;
    const prev = points[points.length - 2].l100;
    const diff = last - prev;
    if (Math.abs(diff) < 0.2) tendance = null;
    else tendance = diff > 0 ? 'hausse' : 'baisse';
  }

  return (
    <View style={ch.wrap}>
      <View style={ch.header}>
        <Text style={ch.title}>Évolution L/100 km</Text>
        {tendance && (
          <View style={[ch.badge, { backgroundColor: tendance === 'baisse' ? COLORS.successBg : COLORS.warningBg }]}>
            <Ionicons
              name={tendance === 'baisse' ? 'trending-down' : 'trending-up'}
              size={13}
              color={tendance === 'baisse' ? COLORS.success : COLORS.warning}
            />
            <Text style={[ch.badgeTxt, { color: tendance === 'baisse' ? COLORS.success : COLORS.warning }]}>
              {tendance === 'baisse' ? 'Baisse' : 'Hausse'} vs dernier plein
            </Text>
          </View>
        )}
      </View>
      <View style={ch.bars}>
        {recent.map((p, i) => {
          const heightPct = p.l100 / maxVal;
          const isLast = i === recent.length - 1;
          const barColor = p.l100 > avg * 1.1 ? COLORS.warning : p.l100 < avg * 0.9 ? COLORS.success : COLORS.info;
          return (
            <View key={p.ts} style={ch.barCol}>
              <Text style={ch.barVal}>{p.l100.toFixed(1)}</Text>
              <View style={ch.barTrack}>
                <View style={[ch.barFill, { height: `${Math.round(heightPct * 100)}%`, backgroundColor: isLast ? barColor : barColor + '80' }]} />
              </View>
              <Text style={ch.barKm}>{(p.km / 1000).toFixed(0)}k</Text>
            </View>
          );
        })}
      </View>
      <Text style={ch.avg}>Moyenne : {avg.toFixed(2)} L/100 km</Text>
    </View>
  );
}

const ch = StyleSheet.create({
  wrap: { marginHorizontal: 14, marginBottom: 12, padding: 14, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 },
  barCol: { flex: 1, alignItems: 'center', gap: 3 },
  barVal: { fontSize: 8, color: COLORS.textSecondary, fontWeight: '600' },
  barTrack: { flex: 1, width: '100%', backgroundColor: COLORS.bg, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barKm: { fontSize: 8, color: COLORS.border },
  avg: { fontSize: 11, color: COLORS.textSecondary, marginTop: 10, textAlign: 'center' },
});

function EntretienCard({ vehicule, kmActuel, onEntretienFait, onEdit }) {
  if (!kmActuel) return null;
  const km = vehicule.dernierEntretienKm || 0;
  const intervalle = vehicule.intervalleEntretien || 5000;
  const parcouru = kmActuel - km;
  const restant = intervalle - parcouru;
  const pct = Math.min(parcouru / intervalle, 1);
  const over = restant < 0;
  const proche = !over && restant <= 1000;

  if (!over && !proche) return null; // Pas d'alerte si tout va bien

  const bgColor = over ? COLORS.dangerBg : COLORS.warningBg;
  const iconColor = over ? COLORS.danger : COLORS.warning;
  const iconName = over ? 'warning-outline' : 'alert-circle-outline';
  const msg = over
    ? `Vidange en retard de ${Math.abs(restant).toLocaleString('fr-FR')} km`
    : `Vidange recommandée dans ${restant.toLocaleString('fr-FR')} km`;

  return (
    <View style={[ec.wrap, { backgroundColor: bgColor, borderColor: iconColor + '40' }]}>
      <View style={ec.row}>
        <Ionicons name={iconName} size={20} color={iconColor} />
        <View style={{ flex: 1 }}>
          <Text style={[ec.title, { color: iconColor }]}>{msg}</Text>
          <Text style={ec.sub}>Dernier entretien : {km.toLocaleString('fr-FR')} km · Intervalle : {intervalle.toLocaleString('fr-FR')} km</Text>
        </View>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={16} color={iconColor} />
        </TouchableOpacity>
      </View>
      <View style={ec.barTrack}>
        <View style={[ec.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: iconColor }]} />
      </View>
      <TouchableOpacity style={[ec.btn, { borderColor: iconColor + '60', backgroundColor: COLORS.card }]} onPress={onEntretienFait}>
        <Ionicons name="checkmark-circle-outline" size={15} color={iconColor} />
        <Text style={[ec.btnTxt, { color: iconColor }]}>Entretien fait — mettre à jour</Text>
      </TouchableOpacity>
    </View>
  );
}

const ec = StyleSheet.create({
  wrap: { marginHorizontal: 14, marginBottom: 12, padding: 14, borderRadius: 16, borderWidth: 0.5 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 11, color: COLORS.textSecondary },
  barTrack: { height: 5, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 99 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 9, borderRadius: 10, borderWidth: 0.5 },
  btnTxt: { fontSize: 12, fontWeight: '600' },
});

export default function CarburantScreen() {
  const { state, dispatch } = useContext(AppContext);
  const { suspendreVerrouillage } = useContext(AuthContext);
  const keyboardHeight = useKeyboardHeight();
  const [filter, setFilter] = useState('all');
  const [budgetModal, setBudgetModal] = useState(false);
  const [fuelModal, setFuelModal] = useState(false);
  const [prixModal, setPrixModal] = useState(false);
  const [entretienModal, setEntretienModal] = useState(false);
  const [addVehiculeInput, setAddVehiculeInput] = useState('');
  const [showAddVehicule, setShowAddVehicule] = useState(false);

  const [fuelAmount, setFuelAmount] = useState('');
  const [fuelKm, setFuelKm] = useState('');
  const [kmUnit, setKmUnit] = useState('km');
  const [fuelNote, setFuelNote] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [kmLoading, setKmLoading] = useState(false);
  const [kmStatus, setKmStatus] = useState(null);
  const [newPrix, setNewPrix] = useState('');
  const [entretienIntervalle, setEntretienIntervalle] = useState('');
  const [entretienDernierKm, setEntretienDernierKm] = useState('');

  const devise = state.devise || 'FCFA';
  const vehicules = state.vehicules || [];
  const vehiculeActifId = state.vehiculeActif || VEHICULE_DEFAUT_ID;
  const vehiculeActif = vehicules.find(v => v.id === vehiculeActifId) || vehicules[0];

  // Données filtrées par véhicule actif
  const allFuel = state.fuel || [];
  const txs = allFuel.filter(t => t.vehiculeId === vehiculeActifId);
  const filtered = applyFilter(txs, filter);
  const cons = txs.filter(t => !t.isBudget);
  const filteredCons = applyFilter(cons, filter);

  const solde = calcSolde(txs, true);
  const totalSpent = filteredCons.reduce((s, t) => s + t.amount, 0);
  const totalLitres = filteredCons.reduce((s, t) => s + (t.litres || 0), 0);

  const sorted = [...cons].sort((a, b) => a.ts - b.ts);
  const lastKm = sorted.length > 0 && sorted[sorted.length - 1].km ? sorted[sorted.length - 1].km : null;

  const now = new Date();
  const depenseCeMois = cons
    .filter(t => { const d = new Date(t.ts); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, t) => s + t.amount, 0);

  // L/100 global pour les stats
  const withKm = [...cons].filter(t => t.km).sort((a, b) => a.ts - b.ts);
  let l100Global = null;
  if (withKm.length >= 2) {
    const totalKm = withKm[withKm.length - 1].km - withKm[0].km;
    const totalL = withKm.slice(1).reduce((s, t) => s + (t.litres || 0), 0);
    if (totalKm > 0 && totalL > 0) l100Global = (totalL / totalKm) * 100;
  }

  const litresPreview = state.prixLitre > 0 && parseFloat(fuelAmount) > 0
    ? (parseFloat(fuelAmount) / state.prixLitre).toFixed(2)
    : null;

  async function pickPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "Autorise l'accès à la caméra dans les paramètres.");
      return;
    }
    Alert.alert('Photo du tableau de bord', 'Choisir la source', [
      { text: 'Caméra', onPress: openCamera },
      { text: 'Galerie', onPress: openGallery },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function openCamera() {
    suspendreVerrouillage();
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) processPhoto(result.assets[0]);
  }

  async function openGallery() {
    suspendreVerrouillage();
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) processPhoto(result.assets[0]);
  }

  async function processPhoto(asset) {
    setPhotoUri(asset.uri);
    setKmLoading(true);
    setKmStatus(null);
    try {
      const result = await TextRecognition.recognize(asset.uri);
      const found = extractKmFromText(result?.text || '');
      if (found) {
        setFuelKm(String(found.km));
        setKmUnit('km');
        setKmStatus({ ok: true, msg: `Kilométrage lu : ${found.km.toLocaleString('fr-FR')} km${found.isMiles ? ' (converti depuis mi)' : ''}` });
      } else {
        setKmStatus({ ok: false, msg: 'Lecture impossible — saisis manuellement' });
      }
    } catch {
      setKmStatus({ ok: false, msg: 'Erreur de lecture — saisis manuellement' });
    }
    setKmLoading(false);
  }

  function openFuelModal() {
    if (!state.prixLitre) {
      Alert.alert('Prix non défini', "Définis d'abord le prix du litre.", [
        { text: 'Définir', onPress: () => setPrixModal(true) },
        { text: 'Annuler', style: 'cancel' },
      ]);
      return;
    }
    setFuelAmount(''); setFuelKm(''); setFuelNote(''); setKmUnit('km');
    setPhotoUri(null); setKmStatus(null); setKmLoading(false);
    setFuelModal(true);
  }

  function saveFuelOp() {
    const amt = parseFloat(fuelAmount);
    if (!amt || amt <= 0) return;
    let km = parseFloat(fuelKm) || null;
    if (km && kmUnit === 'mi') km = Math.round(km * MI_TO_KM);
    const litres = amt / state.prixLitre;
    dispatch({
      type: 'ADD_FUEL',
      tx: {
        label: fuelNote ? `Plein — ${fuelNote}` : 'Plein de carburant',
        amount: amt, litres, km, isBudget: false, ts: Date.now(),
        vehiculeId: vehiculeActifId,
      },
    });
    setFuelModal(false);
  }

  function savePrix() {
    const p = parseFloat(newPrix);
    if (!p || p <= 0) return;
    dispatch({ type: 'SET_PRIX', prix: p });
    setPrixModal(false);
  }

  function handleSaveBudget(montant, remarque) {
    dispatch({
      type: 'ADD_FUEL',
      tx: { label: remarque ? `Approvisionnement — ${remarque}` : 'Approvisionnement carburant', amount: montant, litres: 0, isBudget: true, ts: Date.now(), vehiculeId: vehiculeActifId },
    });
    setBudgetModal(false);
  }

  function handleDelete(ts) {
    Alert.alert('Supprimer', 'Confirmer ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_FUEL', ts }) },
    ]);
  }

  function handleAddVehicule() {
    const nom = addVehiculeInput.trim();
    if (!nom) return;
    const id = 'v_' + Date.now();
    dispatch({ type: 'ADD_VEHICULE', vehicule: { id, nom, intervalleEntretien: 5000, dernierEntretienKm: 0 } });
    dispatch({ type: 'SET_VEHICULE_ACTIF', id });
    setAddVehiculeInput('');
    setShowAddVehicule(false);
  }

  function handleDelVehicule(v) {
    if (v.id === VEHICULE_DEFAUT_ID) { Alert.alert('Impossible', "Le véhicule par défaut ne peut pas être supprimé."); return; }
    const hasTxs = allFuel.some(t => t.vehiculeId === v.id);
    if (hasTxs) { Alert.alert('Impossible', `"${v.nom}" a des transactions. Supprime-les d'abord.`); return; }
    Alert.alert('Supprimer', `Supprimer "${v.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_VEHICULE', id: v.id }) },
    ]);
  }

  function openEntretienModal() {
    setEntretienIntervalle(String(vehiculeActif?.intervalleEntretien || 5000));
    setEntretienDernierKm(String(vehiculeActif?.dernierEntretienKm || 0));
    setEntretienModal(true);
  }

  function saveEntretien() {
    const intervalle = parseInt(entretienIntervalle, 10);
    const dernierKm = parseInt(entretienDernierKm, 10);
    if (!intervalle || intervalle <= 0) return;
    dispatch({ type: 'SET_ENTRETIEN', id: vehiculeActifId, changes: { intervalleEntretien: intervalle, dernierEntretienKm: isNaN(dernierKm) ? 0 : dernierKm } });
    setEntretienModal(false);
  }

  function handleEntretienFait() {
    if (!lastKm) { Alert.alert('Kilométrage inconnu', 'Enregistre d\'abord un plein avec le kilométrage.'); return; }
    Alert.alert('Entretien enregistré', `Kilométrage mis à jour à ${lastKm.toLocaleString('fr-FR')} km.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => dispatch({ type: 'SET_ENTRETIEN', id: vehiculeActifId, changes: { dernierEntretienKm: lastKm } }) },
    ]);
  }

  return (
    <View style={s.container}>
      <ScrollView>
        {/* Sélecteur de véhicule */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.vehiculeScroll} contentContainerStyle={s.vehiculeRow}>
          {vehicules.map(v => (
            <TouchableOpacity
              key={v.id}
              style={[s.vehiculeChip, v.id === vehiculeActifId && s.vehiculeChipActive]}
              onPress={() => dispatch({ type: 'SET_VEHICULE_ACTIF', id: v.id })}
              onLongPress={() => handleDelVehicule(v)}
              delayLongPress={600}
            >
              <Ionicons name="car-outline" size={13} color={v.id === vehiculeActifId ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[s.vehiculeChipTxt, v.id === vehiculeActifId && s.vehiculeChipTxtActive]}>{v.nom}</Text>
            </TouchableOpacity>
          ))}
          {showAddVehicule ? (
            <View style={s.addVehiculeRow}>
              <TextInput
                style={s.addVehiculeInput}
                placeholder="Nom du véhicule"
                placeholderTextColor={COLORS.textSecondary}
                value={addVehiculeInput}
                onChangeText={setAddVehiculeInput}
                autoFocus
                onSubmitEditing={handleAddVehicule}
                returnKeyType="done"
              />
              <TouchableOpacity style={s.addVehiculeOk} onPress={handleAddVehicule}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddVehicule(false)}>
                <Ionicons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.vehiculeAddChip} onPress={() => setShowAddVehicule(true)}>
              <Ionicons name="add" size={14} color={COLORS.primary} />
              <Text style={s.vehiculeAddTxt}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Bouton réglages entretien permanent */}
        <TouchableOpacity style={s.entretienSettingsBtn} onPress={openEntretienModal}>
          <Ionicons name="settings-outline" size={13} color={COLORS.textSecondary} />
          <Text style={s.entretienSettingsTxt}>Réglages entretien</Text>
        </TouchableOpacity>

        {/* Alerte entretien */}
        {vehiculeActif && (
          <EntretienCard
            vehicule={vehiculeActif}
            kmActuel={lastKm}
            onEntretienFait={handleEntretienFait}
            onEdit={openEntretienModal}
          />
        )}

        <SoldeCard
          label="Solde carburant disponible"
          solde={solde}
          leftLabel="Dépensé" leftVal={'-' + fmtMontant(totalSpent, devise)} leftColor={COLORS.danger}
          rightLabel="Litres" rightVal={fmtLitres(totalLitres)} rightColor={COLORS.warning}
          extra={{ label: 'Pleins', val: String(cons.length), color: COLORS.textSecondary }}
        />

        <BudgetMensuelCard
          budgetMensuel={state.budgetMensuel || 0}
          depenseCeMois={depenseCeMois}
          onSet={montant => dispatch({ type: 'SET_BUDGET_MENSUEL', montant })}
        />

        <TouchableOpacity style={s.prixBar} onPress={() => { setNewPrix(String(state.prixLitre || '')); setPrixModal(true); }}>
          <Ionicons name="flame-outline" size={18} color={COLORS.warning} />
          <View style={{ flex: 1 }}>
            <Text style={s.prixLabel}>Prix du litre à la pompe</Text>
            <Text style={s.prixVal}>{state.prixLitre ? fmtMontant(state.prixLitre, devise) + '/L' : 'Non défini — appuie pour définir'}</Text>
          </View>
          <Ionicons name="pencil-outline" size={15} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{fmtLitres(totalLitres)}</Text>
            <Text style={s.statLbl}>Litres consommés</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{fmtMontant(totalSpent, devise)}</Text>
            <Text style={s.statLbl}>Montant dépensé</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{l100Global ? l100Global.toFixed(2) + 'L' : '—'}</Text>
            <Text style={s.statLbl}>Litres / 100 km (moy.)</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{lastKm ? lastKm.toLocaleString('fr-FR') + ' km' : '—'}</Text>
            <Text style={s.statLbl}>Dernier kilométrage</Text>
          </View>
        </View>

        {/* Graphique L/100 */}
        <L100Chart cons={cons} devise={devise} />
        {cons.length > 0 && !lastKm && (
          <View style={s.kmHintBox}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
            <Text style={s.kmHintTxt}>Renseigne le kilométrage à chaque plein pour activer le suivi d'entretien.</Text>
          </View>
        )}

        <FilterBar active={filter} onChange={setFilter} />

        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, { borderColor: COLORS.success }]} onPress={() => setBudgetModal(true)}>
            <Ionicons name="wallet-outline" size={22} color={COLORS.success} />
            <Text style={[s.btnText, { color: COLORS.success }]}>Approvisionner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { borderColor: COLORS.warning }]} onPress={openFuelModal}>
            <Ionicons name="car-outline" size={22} color={COLORS.warning} />
            <Text style={[s.btnText, { color: COLORS.warning }]}>Plein / Conso</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Historique — {vehiculeActif?.nom}</Text>
        <TxList data={filtered} onDelete={handleDelete} isFuel />
      </ScrollView>

      <OpModal visible={budgetModal} title="Approvisionnement carburant" onClose={() => setBudgetModal(false)} onSave={handleSaveBudget} />

      {/* Modal Plein */}
      <Modal visible={fuelModal} transparent animationType="slide" onRequestClose={() => setFuelModal(false)}>
        <TouchableWithoutFeedback onPress={() => setFuelModal(false)}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <ScrollView style={[s.modal, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 12 : 20 }]} keyboardShouldPersistTaps="handled">
                  <Text style={s.modalTitle}>Enregistrer une consommation</Text>
                  <Text style={s.vehiculeBadge}>{vehiculeActif?.nom}</Text>

                  <Text style={s.label}>Montant dépensé</Text>
                  <TextInput style={s.input} placeholder="Ex: 10 000" placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric" value={fuelAmount} onChangeText={setFuelAmount} />
                  {litresPreview && (
                    <View style={s.preview}>
                      <Text style={s.previewTxt}>→ {litresPreview} litres à {fmtMontant(state.prixLitre, devise)}/L</Text>
                    </View>
                  )}

                  <Text style={s.label}>Photo du tableau de bord</Text>
                  <TouchableOpacity style={s.photoZone} onPress={pickPhoto}>
                    {photoUri ? (
                      <Image source={{ uri: photoUri }} style={s.photoImg} />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={28} color={COLORS.textSecondary} />
                        <Text style={s.photoTxt}>Appuie pour prendre une photo</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {kmLoading && (
                    <View style={s.kmStatus}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={s.kmTxt}>Lecture du kilométrage...</Text>
                    </View>
                  )}
                  {kmStatus && (
                    <View style={[s.kmStatus, { backgroundColor: kmStatus.ok ? COLORS.successBg : COLORS.warningBg }]}>
                      <Ionicons name={kmStatus.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={kmStatus.ok ? COLORS.success : COLORS.warning} />
                      <Text style={[s.kmTxt, { color: kmStatus.ok ? COLORS.success : COLORS.warning }]}>{kmStatus.msg}</Text>
                    </View>
                  )}

                  <View style={s.kmHeaderRow}>
                    <Text style={s.label}>Kilométrage</Text>
                    <View style={s.unitToggle}>
                      <TouchableOpacity style={[s.unitBtn, kmUnit === 'km' && s.unitBtnActive]} onPress={() => setKmUnit('km')}>
                        <Text style={[s.unitTxt, kmUnit === 'km' && s.unitTxtActive]}>Km</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.unitBtn, kmUnit === 'mi' && s.unitBtnActive]} onPress={() => setKmUnit('mi')}>
                        <Text style={[s.unitTxt, kmUnit === 'mi' && s.unitTxtActive]}>Mi</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TextInput style={s.input}
                    placeholder={kmUnit === 'mi' ? 'Ex: 28000 (en miles)' : 'Lu auto ou saisis manuellement'}
                    placeholderTextColor={COLORS.textSecondary} keyboardType="numeric"
                    value={fuelKm} onChangeText={setFuelKm} />
                  {kmUnit === 'mi' && parseFloat(fuelKm) > 0 && (
                    <View style={s.preview}>
                      <Text style={s.previewTxt}>→ {Math.round(parseFloat(fuelKm) * MI_TO_KM).toLocaleString('fr-FR')} km à l'enregistrement</Text>
                    </View>
                  )}

                  <Text style={s.label}>Remarque (optionnel)</Text>
                  <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="Ex: trajet Bamako-Ségou..." placeholderTextColor={COLORS.textSecondary}
                    value={fuelNote} onChangeText={setFuelNote} multiline />

                  <View style={s.mActions}>
                    <TouchableOpacity style={s.btnCancel} onPress={() => setFuelModal(false)}>
                      <Text style={{ color: COLORS.textSecondary }}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.btnConfirm} onPress={saveFuelOp}>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Prix */}
      <Modal visible={prixModal} transparent animationType="slide" onRequestClose={() => setPrixModal(false)}>
        <TouchableWithoutFeedback onPress={() => setPrixModal(false)}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={[s.modal, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 12 : 20 }]}>
                <Text style={s.modalTitle}>Prix du carburant à la pompe</Text>
                <Text style={s.label}>Prix par litre</Text>
                <TextInput style={s.input} placeholder="Ex: 650" placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric" value={newPrix} onChangeText={setNewPrix} autoFocus />
                <View style={s.mActions}>
                  <TouchableOpacity style={s.btnCancel} onPress={() => setPrixModal(false)}>
                    <Text style={{ color: COLORS.textSecondary }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnConfirm} onPress={savePrix}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Entretien */}
      <Modal visible={entretienModal} transparent animationType="fade" onRequestClose={() => setEntretienModal(false)}>
        <TouchableWithoutFeedback onPress={() => setEntretienModal(false)}>
          <View style={s.overlayCenter}>
            <TouchableWithoutFeedback>
              <View style={[s.modalCenter, { marginBottom: keyboardHeight > 0 ? keyboardHeight - 20 : 0 }]}>
                <Text style={s.modalTitle}>Paramètres entretien — {vehiculeActif?.nom}</Text>
                <Text style={s.label}>Intervalle vidange (km)</Text>
                <TextInput style={s.input} placeholder="Ex: 5000" placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric" value={entretienIntervalle} onChangeText={setEntretienIntervalle} autoFocus />
                <Text style={s.label}>Kilométrage au dernier entretien</Text>
                <TextInput style={s.input} placeholder="Ex: 45000" placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric" value={entretienDernierKm} onChangeText={setEntretienDernierKm} />
                <View style={s.mActions}>
                  <TouchableOpacity style={s.btnCancel} onPress={() => setEntretienModal(false)}>
                    <Text style={{ color: COLORS.textSecondary }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnConfirm} onPress={saveEntretien}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },

  vehiculeScroll: { marginBottom: 4 },
  vehiculeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  vehiculeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  vehiculeChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5EE' },
  vehiculeChipTxt: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  vehiculeChipTxtActive: { color: COLORS.primary, fontWeight: '700' },
  vehiculeAddChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary + '60', backgroundColor: COLORS.successBg },
  vehiculeAddTxt: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  addVehiculeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addVehiculeInput: { backgroundColor: COLORS.bg, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, fontSize: 13, color: COLORS.textPrimary, width: 140 },
  addVehiculeOk: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  vehiculeBadge: { fontSize: 11, color: COLORS.primary, fontWeight: '600', backgroundColor: '#E8F5EE', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 12 },

  entretienSettingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  entretienSettingsTxt: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  kmHintBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 14, marginBottom: 10, padding: 10, backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 0.5, borderColor: COLORS.border },
  kmHintTxt: { flex: 1, fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },

  prixBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginBottom: 12, padding: 12, backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 0.5, borderColor: COLORS.border },
  prixLabel: { fontSize: 11, color: COLORS.textSecondary },
  prixVal: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 14, marginBottom: 12 },
  statCard: { width: '47%', padding: 12, backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  statLbl: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginBottom: 14 },
  btn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 0.5, gap: 4, backgroundColor: COLORS.card },
  btnText: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', marginHorizontal: 14, marginBottom: 6 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalCenter: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  input: { backgroundColor: COLORS.bg, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.textPrimary, marginBottom: 12 },
  preview: { backgroundColor: COLORS.infoBg, borderRadius: 8, padding: 8, marginBottom: 12 },
  previewTxt: { fontSize: 12, color: COLORS.info },
  photoZone: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 12, backgroundColor: COLORS.bg },
  photoImg: { width: '100%', height: 140, borderRadius: 8, resizeMode: 'cover' },
  photoTxt: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  kmStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 12, backgroundColor: COLORS.bg },
  kmTxt: { fontSize: 12, color: COLORS.textSecondary },
  kmHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitToggle: { flexDirection: 'row', backgroundColor: COLORS.bg, borderRadius: 8, padding: 2, gap: 2 },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  unitBtnActive: { backgroundColor: COLORS.primary },
  unitTxt: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  unitTxtActive: { color: '#fff' },
  mActions: { flexDirection: 'row', gap: 10, marginTop: 4, paddingBottom: 10 },
  btnCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center' },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
});
