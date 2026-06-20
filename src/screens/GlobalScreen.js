import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { AppContext } from '../AppContext';
import { AuthContext } from '../auth/AuthContext';
import { clearPin } from '../auth/authStorage';
import { COLORS, fmtMontant, fmtLitres, calcSolde, calcLitrePer100, calcCreanceRestant, isCreanceSolde, fmtDate } from '../storage/utils';
import XLSX from 'xlsx';

const CAT_LABELS = {
  dep: { perso: 'Perso', chargesFixes: 'Charg Fix', autres: 'Autres' },
};

function ModCard({ name, icon, color, solde, stats, onExport, devise }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardLeft}>
          <View style={[s.cardIconWrap, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
          <Text style={s.cardName}>{name}</Text>
        </View>
        <TouchableOpacity style={s.exportBtn} onPress={onExport}>
          <Ionicons name="document-text-outline" size={14} color={COLORS.success} />
          <Text style={s.exportTxt}>Excel</Text>
        </TouchableOpacity>
      </View>
      <Text style={[s.solde, solde < 0 && { color: COLORS.danger }]}>{fmtMontant(solde, devise)}</Text>
      <View style={s.statsRow}>
        {stats.map((st, i) => (
          <View key={i} style={s.stat}>
            <Text style={s.statLbl}>{st.label}</Text>
            <Text style={[s.statVal, st.color ? { color: st.color } : {}]}>{st.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const DEVISES = ['FCFA', 'EUR', 'USD'];

export default function GlobalScreen() {
  const { state, dispatch } = useContext(AppContext);
  const { lock } = useContext(AuthContext);
  const devise = state.devise || 'FCFA';

  function handleChangePin() {
    Alert.alert('Changer le code PIN', 'Tu vas devoir définir un nouveau code au prochain écran.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Continuer', onPress: async () => { await clearPin(); lock(); } }
    ]);
  }

  function exportMod(mod) {
    try {
      const names = { cam: 'Envoi_Ext', dep: 'Depenses', fuel: 'Carburant', creances: 'Creances' };
      let rows;
      if (mod === 'creances') {
        rows = state.creances.length
          ? [...state.creances].reverse().map(c => ({
              Type: c.type === 'pret' ? 'Prêt' : 'Dette',
              Personne: c.personne,
              Date: fmtDate(c.date),
              'Montant initial': c.montant,
              Remboursé: (c.remboursements || []).reduce((s, r) => s + r.montant, 0),
              Restant: Math.max(calcCreanceRestant(c), 0),
              Statut: isCreanceSolde(c) ? 'Soldé' : 'En cours',
              Remarque: c.remarque || '',
            }))
          : [{ Type: '', Personne: 'Aucune donnée', Date: '', 'Montant initial': '', Remboursé: '', Restant: '', Statut: '', Remarque: '' }];
      } else if (mod === 'fuel') {
        rows = state.fuel.length
          ? [...state.fuel].reverse().map(tx => ({ Date: fmtDate(tx.ts), Type: tx.isBudget ? 'Budget' : 'Consommation', Détail: tx.label, 'Montant (FCFA)': tx.amount, Litres: tx.isBudget ? '' : (tx.litres || 0).toFixed(2), Kilométrage: tx.km || '' }))
          : [{ Date: '', Type: '', Détail: 'Aucune donnée', 'Montant (FCFA)': '', Litres: '', Kilométrage: '' }];
      } else {
        let cum = 0;
        const cumMap = {};
        [...state[mod]].forEach(tx => { cum += tx.plus ? tx.amount : -tx.amount; cumMap[tx.ts] = cum; });
        const catLabel = CAT_LABELS[mod];
        rows = state[mod].length
          ? [...state[mod]].reverse().map(tx => ({
              Date: fmtDate(tx.ts), Type: tx.plus ? 'Entrée' : 'Sortie',
              ...(catLabel ? { Catégorie: catLabel[tx.cat] || tx.cat || '' } : {}),
              Opération: tx.label, 'Montant (FCFA)': tx.amount, 'Solde cumulé': cumMap[tx.ts] || 0
            }))
          : [{ Date: '', Type: '', Opération: 'Aucune donnée', 'Montant (FCFA)': '', 'Solde cumulé': '' }];
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, names[mod]);
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      const path = FileSystem.documentDirectory + `${names[mod]}_${today}.xlsx`;
      FileSystem.writeAsStringAsync(path, wbout, { encoding: FileSystem.EncodingType.Base64 })
        .then(() => Sharing.shareAsync(path));
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le fichier.');
    }
  }

  async function exportAll() {
    try {
      const wb = XLSX.utils.book_new();
      const mods = [
        { mod: 'dep', name: 'Depenses' },
        { mod: 'cam', name: 'Envoi Ext' },
        { mod: 'creances', name: 'Creances' },
        { mod: 'fuel', name: 'Carburant' },
      ];
      mods.forEach(({ mod, name }) => {
        let rows;
        if (mod === 'creances') {
          rows = state.creances.length
            ? [...state.creances].reverse().map(c => ({
                Type: c.type === 'pret' ? 'Prêt' : 'Dette',
                Personne: c.personne,
                'Montant initial': c.montant,
                Remboursé: (c.remboursements || []).reduce((s, r) => s + r.montant, 0),
                Restant: Math.max(calcCreanceRestant(c), 0),
                Statut: isCreanceSolde(c) ? 'Soldé' : 'En cours',
              }))
            : [{ Type: '', Personne: 'Aucune donnée', 'Montant initial': '', Remboursé: '', Restant: '', Statut: '' }];
        } else if (mod === 'fuel') {
          rows = state.fuel.length
            ? [...state.fuel].reverse().map(tx => ({ Date: fmtDate(tx.ts), Type: tx.isBudget ? 'Budget' : 'Conso', Détail: tx.label, Montant: tx.amount, Litres: tx.isBudget ? '' : (tx.litres || 0).toFixed(2), KM: tx.km || '' }))
            : [{ Date: '', Type: '', Détail: 'Aucune donnée', Montant: '', Litres: '', KM: '' }];
        } else {
          const catLabel = CAT_LABELS[mod];
          rows = state[mod].length
            ? [...state[mod]].reverse().map(tx => ({
                Date: fmtDate(tx.ts), Type: tx.plus ? 'Entrée' : 'Sortie',
                ...(catLabel ? { Catégorie: catLabel[tx.cat] || tx.cat || '' } : {}),
                Opération: tx.label, Montant: tx.amount
              }))
            : [{ Date: '', Type: '', Opération: 'Aucune donnée', Montant: '' }];
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
      });
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      const path = FileSystem.documentDirectory + `Gestion_Complete_${today}.xlsx`;
      await FileSystem.writeAsStringAsync(path, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(path);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le fichier.');
    }
  }

  const fuelCons = state.fuel.filter(t => !t.isBudget);
  const l100 = calcLitrePer100(state.fuel);

  return (
    <ScrollView style={s.container}>
      {/* Sélecteur de devise */}
      <View style={s.deviseRow}>
        <Ionicons name="cash-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
        <Text style={s.deviseLbl}>Devise :</Text>
        {DEVISES.map(d => (
          <TouchableOpacity
            key={d}
            style={[s.devisePill, devise === d && s.devisePillActive]}
            onPress={() => dispatch({ type: 'SET_DEVISE', devise: d })}
            activeOpacity={0.7}
          >
            <Text style={[s.devisePillTxt, devise === d && s.devisePillTxtActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ModCard
        name="Dépenses" icon="receipt-outline" color={COLORS.success}
        solde={calcSolde(state.dep)} devise={devise}
        stats={[
          { label: 'Perso', val: fmtMontant(calcSolde(state.dep.filter(t => (t.cat || 'perso') === 'perso')), devise) },
          { label: 'Charg Fix', val: fmtMontant(calcSolde(state.dep.filter(t => t.cat === 'chargesFixes')), devise) },
          { label: 'Autres', val: fmtMontant(calcSolde(state.dep.filter(t => t.cat === 'autres')), devise) },
        ]}
        onExport={() => exportMod('dep')}
      />
      <ModCard
        name="Envoi Extérieur" icon="send-outline" color={COLORS.info}
        solde={calcSolde(state.cam)} devise={devise}
        stats={[
          { label: 'Dépôts reçus', val: '+' + fmtMontant(state.cam.filter(t => t.plus).reduce((s, t) => s + t.amount, 0), devise), color: COLORS.info },
          { label: 'Envois', val: '-' + fmtMontant(state.cam.filter(t => !t.plus).reduce((s, t) => s + t.amount, 0), devise), color: COLORS.danger },
          { label: 'Opérations', val: String(state.cam.length) },
        ]}
        onExport={() => exportMod('cam')}
      />
      <ModCard
        name="Créances" icon="people-outline" color={COLORS.textPrimary}
        solde={
          (state.creances || []).filter(c => c.type === 'pret').reduce((s, c) => s + Math.max(calcCreanceRestant(c), 0), 0)
          - (state.creances || []).filter(c => c.type === 'dette').reduce((s, c) => s + Math.max(calcCreanceRestant(c), 0), 0)
        }
        devise={devise}
        stats={[
          { label: 'À recevoir', val: fmtMontant((state.creances || []).filter(c => c.type === 'pret').reduce((s, c) => s + Math.max(calcCreanceRestant(c), 0), 0), devise), color: COLORS.success },
          { label: 'À payer', val: fmtMontant((state.creances || []).filter(c => c.type === 'dette').reduce((s, c) => s + Math.max(calcCreanceRestant(c), 0), 0), devise), color: COLORS.danger },
          { label: 'Dossiers', val: String((state.creances || []).length) },
        ]}
        onExport={() => exportMod('creances')}
      />
      <ModCard
        name="Carburant" icon="car-outline" color={COLORS.warning}
        solde={calcSolde(state.fuel, true)} devise={devise}
        stats={[
          { label: 'Dépensé', val: fmtMontant(fuelCons.reduce((s, t) => s + t.amount, 0), devise), color: COLORS.danger },
          { label: 'Litres', val: fmtLitres(fuelCons.reduce((s, t) => s + (t.litres || 0), 0)), color: COLORS.warning },
          { label: 'L/100km', val: l100 ? l100.toFixed(2) : '—' },
        ]}
        onExport={() => exportMod('fuel')}
      />

      <TouchableOpacity style={s.exportAllBtn} onPress={exportAll}>
        <Ionicons name="document-text-outline" size={18} color={COLORS.success} />
        <Text style={s.exportAllTxt}>Exporter tout — 4 onglets Excel</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.securityBtn} onPress={handleChangePin}>
        <Ionicons name="lock-closed-outline" size={16} color={COLORS.textSecondary} />
        <Text style={s.securityTxt}>Changer le code PIN</Text>
      </TouchableOpacity>

      <Text style={s.credit}>by Rodrigue Boungang</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F3', padding: 14 },
  deviseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  deviseLbl: { fontSize: 12, color: COLORS.textSecondary, marginRight: 8 },
  devisePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, marginRight: 6 },
  devisePillActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5EE' },
  devisePillTxt: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  devisePillTxtActive: { color: COLORS.primary, fontWeight: '700' },
  card: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 0.5, borderColor: COLORS.border, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  exportTxt: { fontSize: 11, color: COLORS.success, fontWeight: '500' },
  solde: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10, letterSpacing: -0.3 },
  statsRow: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: COLORS.border, flexWrap: 'wrap' },
  stat: {},
  statLbl: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  statVal: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  exportAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: COLORS.success + '50', backgroundColor: COLORS.successBg, marginBottom: 12 },
  exportAllTxt: { fontSize: 14, color: COLORS.success, fontWeight: '600' },
  securityBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  securityTxt: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  credit: { textAlign: 'center', fontSize: 11, color: COLORS.border, marginBottom: 30, marginTop: 4 },
});
