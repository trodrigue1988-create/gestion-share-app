import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import SoldeCard from '../components/SoldeCard';
import FilterBar, { applyFilter } from '../components/FilterBar';
import TxList from '../components/TxList';
import EnvoiModal from '../components/EnvoiModal';
import { COLORS, fmtMontant } from '../storage/utils';

export default function EnvoiExtScreen() {
  const { state, dispatch } = useContext(AppContext);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);

  const devise = state.devise || 'FCFA';
  const txs = state.envois || [];
  const filtered = applyFilter(txs, filter);

  const totalEnvoye = filtered.reduce((s, t) => s + (t.amount || 0), 0);
  const totalFrais = filtered.reduce((s, t) => s + (t.frais || 0), 0);

  // Totaux par destinataire sur la période filtrée
  const parDestinataire = filtered.reduce((acc, t) => {
    const dest = t.destinataire || 'Non renseigné';
    acc[dest] = (acc[dest] || 0) + (t.amount || 0);
    return acc;
  }, {});
  const destEntries = Object.entries(parDestinataire).sort((a, b) => b[1] - a[1]);

  function handleSave(tx) {
    dispatch({ type: 'ADD_TX', mod: 'envois', tx });
    setModal(false);
  }

  function handleDelete(ts) {
    Alert.alert('Supprimer', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'DEL_TX', mod: 'envois', ts }) },
    ]);
  }

  return (
    <View style={s.container}>
      <ScrollView>
        <SoldeCard
          label="Envoi Extérieur"
          solde={-totalEnvoye}
          icon="send-outline"
          iconColor={COLORS.info}
          leftLabel="Total envoyé" leftVal={fmtMontant(totalEnvoye, devise)} leftColor={COLORS.info}
          rightLabel="Frais totaux" rightVal={fmtMontant(totalFrais, devise)} rightColor={COLORS.danger}
        />

        <FilterBar active={filter} onChange={setFilter} />

        <TouchableOpacity style={s.mainBtn} onPress={() => setModal(true)}>
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={s.mainBtnTxt}>Nouvel envoi</Text>
        </TouchableOpacity>

        {destEntries.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Par destinataire</Text>
            {destEntries.map(([dest, total]) => (
              <View key={dest} style={s.destRow}>
                <View style={s.destIcon}>
                  <Ionicons name="person-outline" size={14} color={COLORS.info} />
                </View>
                <Text style={s.destName} numberOfLines={1}>{dest}</Text>
                <Text style={s.destTotal}>{fmtMontant(total, devise)}</Text>
              </View>
            ))}
            {totalFrais > 0 && (
              <View style={[s.destRow, s.fraisRow]}>
                <View style={[s.destIcon, { backgroundColor: COLORS.dangerBg }]}>
                  <Ionicons name="receipt-outline" size={14} color={COLORS.danger} />
                </View>
                <Text style={[s.destName, { color: COLORS.danger }]}>Frais totaux</Text>
                <Text style={[s.destTotal, { color: COLORS.danger }]}>{fmtMontant(totalFrais, devise)}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={s.histTitle}>Historique</Text>
        <TxList data={filtered} onDelete={handleDelete} emptyText="Aucun envoi enregistré" />
      </ScrollView>

      <EnvoiModal visible={modal} onClose={() => setModal(false)} onSave={handleSave} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F3' },
  mainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 14, padding: 14, borderRadius: 16, backgroundColor: COLORS.info,
  },
  mainBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  section: {
    marginHorizontal: 14, marginBottom: 14, backgroundColor: COLORS.card,
    borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border,
    overflow: 'hidden', padding: 14,
  },
  sectionTitle: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  fraisRow: { borderTopWidth: 0.5, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 10 },
  destIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.infoBg, alignItems: 'center', justifyContent: 'center' },
  destName: { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  destTotal: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  histTitle: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginHorizontal: 14, marginBottom: 8 },
});
