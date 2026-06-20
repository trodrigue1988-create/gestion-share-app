import React, { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Modal, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { AppContext } from '../AppContext';
import SoldeCard from '../components/SoldeCard';
import FilterBar, { applyFilter } from '../components/FilterBar';
import TxList from '../components/TxList';
import OpModal from '../components/OpModal';
import BudgetMensuelCard from '../components/BudgetMensuelCard';
import { COLORS, fmtMontant, fmtLitres, calcSolde, calcLitrePer100 } from '../storage/utils';

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

export default function CarburantScreen() {
  const { state, dispatch } = useContext(AppContext);
  const [filter, setFilter] = useState('all');
  const [budgetModal, setBudgetModal] = useState(false);
  const [fuelModal, setFuelModal] = useState(false);
  const [prixModal, setPrixModal] = useState(false);

  const [fuelAmount, setFuelAmount] = useState('');
  const [fuelKm, setFuelKm] = useState('');
  const [kmUnit, setKmUnit] = useState('km');
  const [fuelNote, setFuelNote] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [kmLoading, setKmLoading] = useState(false);
  const [kmStatus, setKmStatus] = useState(null);
  const [newPrix, setNewPrix] = useState('');

  const txs = state.fuel;
  const filtered = applyFilter(txs, filter);
  const devise = state.devise || 'FCFA';
  const solde = calcSolde(txs, true);
  const cons = txs.filter(t => !t.isBudget);
  const filteredCons = applyFilter(cons, filter);
  const totalSpent = filteredCons.reduce((s, t) => s + t.amount, 0);
  const totalLitres = filteredCons.reduce((s, t) => s + (t.litres || 0), 0);
  const l100 = calcLitrePer100(txs);
  const sorted = [...cons].sort((a, b) => a.ts - b.ts);

  const now = new Date();
  const depenseCeMois = cons
    .filter(t => {
      const d = new Date(t.ts);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, t) => s + t.amount, 0);
  const lastKm = sorted.length && sorted[sorted.length - 1].km ? sorted[sorted.length - 1].km : null;

  const litresPreview = state.prixLitre > 0 && parseFloat(fuelAmount) > 0
    ? (parseFloat(fuelAmount) / state.prixLitre).toFixed(2)
    : null;

  async function pickPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorise l\'accès à la caméra dans les paramètres.');
      return;
    }
    Alert.alert('Photo du tableau de bord', 'Choisir la source', [
      { text: 'Caméra', onPress: () => openCamera() },
      { text: 'Galerie', onPress: () => openGallery() },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function openCamera() {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) processPhoto(result.assets[0]);
  }

  async function openGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) processPhoto(result.assets[0]);
  }

  async function processPhoto(asset) {
    setPhotoUri(asset.uri);
    setKmLoading(true);
    setKmStatus(null);
    try {
      const result = await TextRecognition.recognize(asset.uri);
      const fullText = result?.text || '';
      const found = extractKmFromText(fullText);
      if (found) {
        setFuelKm(String(found.km));
        setKmUnit('km');
        setKmStatus({
          ok: true,
          msg: `Kilométrage lu : ${found.km.toLocaleString('fr-FR')} km${found.isMiles ? ' (converti depuis mi)' : ''}`
        });
      } else {
        setKmStatus({ ok: false, msg: 'Lecture impossible — saisis manuellement' });
      }
    } catch (e) {
      setKmStatus({ ok: false, msg: 'Erreur de lecture — saisis manuellement' });
    }
    setKmLoading(false);
  }

  function openFuelModal() {
    if (!state.prixLitre) {
      Alert.alert('Prix non défini', 'Définis d\'abord le prix du litre.', [
        { text: 'Définir', onPress: () => setPrixModal(true) },
        { text: 'Annuler', style: 'cancel' }
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
        amount: amt, litres, km, isBudget: false, ts: Date.now()
      }
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
      tx: { label: remarque ? `Budget — ${remarque}` : 'Budget carburant', amount: montant, litres: 0, isBudget: true, ts: Date.now() }
    });
    setBudgetModal(false);
  }

  function handleDelete(ts) {
    Alert.alert('Supprimer', 'Confirmer ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_FUEL', ts }) }
    ]);
  }

  return (
    <View style={s.container}>
      <ScrollView>
        <SoldeCard
          label="Budget carburant restant"
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
            <Text style={s.statVal}>{l100 ? l100.toFixed(2) + 'L' : '—'}</Text>
            <Text style={s.statLbl}>Litres / 100 km</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{lastKm ? lastKm.toLocaleString('fr-FR') + ' km' : '—'}</Text>
            <Text style={s.statLbl}>Dernier kilométrage</Text>
          </View>
        </View>

        <FilterBar active={filter} onChange={setFilter} />

        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, { borderColor: COLORS.success }]} onPress={() => setBudgetModal(true)}>
            <Ionicons name="wallet-outline" size={22} color={COLORS.success} />
            <Text style={[s.btnText, { color: COLORS.success }]}>Ajouter budget</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { borderColor: COLORS.warning }]} onPress={openFuelModal}>
            <Ionicons name="car-outline" size={22} color={COLORS.warning} />
            <Text style={[s.btnText, { color: COLORS.warning }]}>Plein / Conso</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Historique</Text>
        <TxList data={filtered} onDelete={handleDelete} isFuel />
      </ScrollView>

      <OpModal visible={budgetModal} title="Budget carburant" onClose={() => setBudgetModal(false)} onSave={handleSaveBudget} />

      {/* Modal Plein */}
      <Modal visible={fuelModal} transparent animationType="slide" onRequestClose={() => setFuelModal(false)}>
        <TouchableWithoutFeedback onPress={() => setFuelModal(false)}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
                  <Text style={s.modalTitle}>Enregistrer une consommation</Text>

                  <Text style={s.label}>Montant dépensé (FCFA)</Text>
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
                      <TouchableOpacity
                        style={[s.unitBtn, kmUnit === 'km' && s.unitBtnActive]}
                        onPress={() => setKmUnit('km')}
                      >
                        <Text style={[s.unitTxt, kmUnit === 'km' && s.unitTxtActive]}>Km</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.unitBtn, kmUnit === 'mi' && s.unitBtnActive]}
                        onPress={() => setKmUnit('mi')}
                      >
                        <Text style={[s.unitTxt, kmUnit === 'mi' && s.unitTxtActive]}>Mi</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TextInput style={s.input} placeholder={kmUnit === 'mi' ? 'Ex: 28000 (en miles)' : 'Lu auto ou saisis manuellement'}
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
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Prix */}
      <Modal visible={prixModal} transparent animationType="slide" onRequestClose={() => setPrixModal(false)}>
        <TouchableWithoutFeedback onPress={() => setPrixModal(false)}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={s.modal}>
                <Text style={s.modalTitle}>Prix du carburant à la pompe</Text>
                <Text style={s.label}>Prix par litre (FCFA)</Text>
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
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
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
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
