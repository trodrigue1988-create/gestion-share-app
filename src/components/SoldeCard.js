import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, fmtMontant } from '../storage/utils';
import { AppContext } from '../AppContext';

export default function SoldeCard({ label, solde, leftLabel, leftVal, leftColor, rightLabel, rightVal, rightColor, extra, icon, iconColor }) {
  const { state } = useContext(AppContext);
  const devise = state.devise || 'FCFA';
  const isNeg = solde < 0;
  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={s.topLeft}>
          {icon && (
            <View style={[s.iconWrap, { backgroundColor: iconColor ? iconColor + '22' : '#E8F5EE' }]}>
              <Ionicons name={icon} size={16} color={iconColor || COLORS.primary} />
            </View>
          )}
          <Text style={s.label}>{label}</Text>
        </View>
      </View>
      <Text style={[s.amount, isNeg && { color: COLORS.danger }]}>{fmtMontant(solde, devise)}</Text>
      {(leftLabel || rightLabel || extra) && (
        <View style={s.statsRow}>
          {leftLabel ? (
            <View style={s.stat}>
              <Text style={s.statLbl}>{leftLabel}</Text>
              <Text style={[s.statVal, { color: leftColor || COLORS.success }]}>{leftVal}</Text>
            </View>
          ) : null}
          {rightLabel ? (
            <View style={s.stat}>
              <Text style={s.statLbl}>{rightLabel}</Text>
              <Text style={[s.statVal, { color: rightColor || COLORS.danger }]}>{rightVal}</Text>
            </View>
          ) : null}
          {extra ? (
            <View style={s.stat}>
              <Text style={s.statLbl}>{extra.label}</Text>
              <Text style={[s.statVal, { color: extra.color || COLORS.textPrimary }]}>{extra.val}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    margin: 14,
    padding: 18,
    backgroundColor: '#F0FDF6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B8DFCA',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: COLORS.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  amount: { fontSize: 30, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14, letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#A8D5BC', flexWrap: 'wrap' },
  stat: {},
  statLbl: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  statVal: { fontSize: 13, fontWeight: '600' },
});
