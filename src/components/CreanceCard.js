import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, fmtMontant, fmtDate, calcCreanceRestant, isCreanceSolde } from '../storage/utils';
import { AppContext } from '../AppContext';

function echeanceStatus(c) {
  if (!c.echeance || isCreanceSolde(c)) return null;
  const now = Date.now();
  const diffMs = c.echeance - now;
  const diffJours = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffMs < 0) return { type: 'retard', jours: Math.abs(diffJours) };
  if (diffJours <= 3) return { type: 'proche', jours: diffJours };
  return { type: 'ok', date: new Date(c.echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) };
}

async function relancerWhatsApp(c, restant, devise) {
  const retard = echeanceStatus(c);
  let msg = `Salut ${c.personne}, petit rappel concernant le prêt de ${fmtMontant(restant, devise)}`;
  if (retard?.type === 'retard') {
    msg += ` — l'échéance est dépassée de ${retard.jours} jour${retard.jours > 1 ? 's' : ''}`;
  } else if (retard?.type === 'proche') {
    msg += ` — l'échéance approche (dans ${retard.jours} jour${retard.jours > 1 ? 's' : ''})`;
  }
  msg += `. Merci !`;

  const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('WhatsApp non disponible', "WhatsApp n'est pas installé sur cet appareil.");
    return;
  }
  Linking.openURL(url);
}

export default function CreanceCard({ c, onAddRemb, onDelete, onToggleCloture, onDelRemb }) {
  const [open, setOpen] = useState(false);
  const { state } = useContext(AppContext);
  const devise = state.devise || 'FCFA';
  const restant = Math.max(calcCreanceRestant(c), 0);
  const solde = isCreanceSolde(c);
  const totalRemb = (c.remboursements || []).reduce((s, r) => s + r.montant, 0);
  const pct = c.montant > 0 ? Math.min(totalRemb / c.montant, 1) : 0;
  const ech = echeanceStatus(c);

  function Badge() {
    if (solde) {
      return (
        <View style={[s.badge, s.badgeSolde]}>
          <Text style={[s.badgeTxt, { color: COLORS.success }]}>✓ Soldé</Text>
        </View>
      );
    }
    if (ech?.type === 'retard') {
      return (
        <View style={[s.badge, { backgroundColor: COLORS.dangerBg }]}>
          <Text style={[s.badgeTxt, { color: COLORS.danger }]}>⚠ Retard {ech.jours}j</Text>
        </View>
      );
    }
    if (ech?.type === 'proche') {
      return (
        <View style={[s.badge, { backgroundColor: COLORS.warningBg }]}>
          <Text style={[s.badgeTxt, { color: COLORS.warning }]}>⏰ J-{ech.jours}</Text>
        </View>
      );
    }
    return (
      <View style={[s.badge, s.badgeEnCours]}>
        <Text style={[s.badgeTxt, { color: COLORS.warning }]}>⏳ En cours</Text>
      </View>
    );
  }

  return (
    <View style={[s.card, solde && s.cardSolde]}>
      <TouchableOpacity style={s.header} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={[s.avatar, { backgroundColor: solde ? COLORS.successBg : '#E8F5EE' }]}>
          <Text style={[s.avatarTxt, { color: solde ? COLORS.success : COLORS.primary }]}>
            {c.personne.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={s.headerInfo}>
          <View style={s.headerRow}>
            <Text style={s.personne}>{c.personne}</Text>
            <Text style={[s.montant, { color: solde ? COLORS.success : COLORS.textPrimary }]}>
              {fmtMontant(restant, devise)}
            </Text>
          </View>
          <View style={s.headerRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.sub} numberOfLines={1}>
                {fmtDate(c.date)}{c.remarque ? ` · ${c.remarque}` : ''}
              </Text>
              {ech?.type === 'ok' && (
                <Text style={s.echDate}>Échéance : {ech.date}</Text>
              )}
            </View>
            <Badge />
          </View>
          {!solde && c.montant > 0 && (
            <View style={s.miniBar}>
              <View style={[s.miniBarFill, { width: `${pct * 100}%` }]} />
            </View>
          )}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      {open && (
        <View style={s.detail}>
          <View style={s.detailCards}>
            <View style={s.detailCard}>
              <Text style={s.detailLbl}>Initial</Text>
              <Text style={s.detailVal}>{fmtMontant(c.montant, devise)}</Text>
            </View>
            <View style={[s.detailCard, { backgroundColor: COLORS.successBg }]}>
              <Text style={s.detailLbl}>Remboursé</Text>
              <Text style={[s.detailVal, { color: COLORS.success }]}>{fmtMontant(totalRemb, devise)}</Text>
            </View>
            <View style={[s.detailCard, restant > 0 ? { backgroundColor: COLORS.dangerBg } : { backgroundColor: COLORS.successBg }]}>
              <Text style={s.detailLbl}>Restant</Text>
              <Text style={[s.detailVal, { color: restant > 0 ? COLORS.danger : COLORS.success }]}>{fmtMontant(restant, devise)}</Text>
            </View>
          </View>

          {(c.remboursements || []).length > 0 && (
            <View style={s.rembSection}>
              <Text style={s.rembTitle}>Remboursements</Text>
              {[...c.remboursements].reverse().map(r => (
                <View key={r.ts} style={s.rembRow}>
                  <View style={s.rembDot} />
                  <Text style={s.rembTxt} numberOfLines={1}>{fmtDate(r.ts)}{r.remarque ? ` · ${r.remarque}` : ''}</Text>
                  <Text style={s.rembAmt}>+{fmtMontant(r.montant, devise)}</Text>
                  <TouchableOpacity onPress={() => onDelRemb(c.id, r.ts)} style={s.rembDel}>
                    <Ionicons name="close-circle-outline" size={16} color={COLORS.border} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, { borderColor: COLORS.primary + '40', backgroundColor: '#E8F5EE' }]} onPress={() => onAddRemb(c)}>
              <Ionicons name="add-circle-outline" size={15} color={COLORS.primary} />
              <Text style={[s.actionTxt, { color: COLORS.primary }]}>Remboursement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { borderColor: COLORS.info + '40', backgroundColor: COLORS.infoBg }]} onPress={() => onToggleCloture(c.id)}>
              <Ionicons name={c.cloture ? 'lock-open-outline' : 'checkmark-circle-outline'} size={15} color={COLORS.info} />
              <Text style={[s.actionTxt, { color: COLORS.info }]}>{c.cloture ? 'Réactiver' : 'Marquer soldé'}</Text>
            </TouchableOpacity>
            {c.type === 'pret' && !solde && (
              <TouchableOpacity
                style={[s.actionBtn, { borderColor: '#25D366' + '50', backgroundColor: '#f0fdf4' }]}
                onPress={() => relancerWhatsApp(c, restant, devise)}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                <Text style={[s.actionTxt, { color: '#25D366' }]}>Relancer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.actionBtn, { borderColor: COLORS.danger + '30', backgroundColor: COLORS.dangerBg }]} onPress={() => onDelete(c.id)}>
              <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
              <Text style={[s.actionTxt, { color: COLORS.danger }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border, marginHorizontal: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardSolde: { opacity: 0.75 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: 17, fontWeight: '700' },
  headerInfo: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  personne: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  montant: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 11, color: COLORS.textSecondary },
  echDate: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 },
  badgeEnCours: { backgroundColor: COLORS.warningBg },
  badgeSolde: { backgroundColor: COLORS.successBg },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  miniBar: { height: 3, backgroundColor: COLORS.bg, borderRadius: 99, marginTop: 6, overflow: 'hidden' },
  miniBarFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 99 },

  detail: { borderTopWidth: 0.5, borderTopColor: COLORS.border, padding: 14, paddingTop: 12, backgroundColor: '#FAFAF8' },
  detailCards: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  detailCard: { flex: 1, padding: 10, backgroundColor: COLORS.bg, borderRadius: 12, alignItems: 'center' },
  detailLbl: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4 },
  detailVal: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },

  rembSection: { marginBottom: 14 },
  rembTitle: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  rembRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rembDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, flexShrink: 0 },
  rembTxt: { flex: 1, fontSize: 12, color: COLORS.textPrimary },
  rembAmt: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  rembDel: { padding: 2 },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 0.5 },
  actionTxt: { fontSize: 12, fontWeight: '600' },
});
