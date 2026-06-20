import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, fmtMontant, fmtDate, fmtLitres } from '../storage/utils';
import { AppContext } from '../AppContext';

function TxItem({ tx, onDelete, isFuel, devise }) {
  const isPlus = isFuel ? tx.isBudget : tx.plus;
  const isConso = isFuel && !tx.isBudget;

  const iconName = isPlus ? 'arrow-down' : isConso ? 'flame' : 'arrow-up';
  const iconColor = isPlus ? COLORS.success : isConso ? COLORS.warning : COLORS.danger;
  const iconBg = isPlus ? COLORS.successBg : isConso ? COLORS.warningBg : COLORS.dangerBg;
  const amountColor = isPlus ? COLORS.success : isConso ? COLORS.warning : COLORS.danger;
  const prefix = isPlus ? '+' : '−';

  const detail = [];
  if (tx.km) detail.push(tx.km.toLocaleString('fr-FR') + ' km');
  if (isConso && tx.litres) detail.push(fmtLitres(tx.litres));

  const isEnvoi = tx.destinataire !== undefined;
  const mainLabel = isEnvoi
    ? (tx.destinataire || 'Non renseigné')
    : (tx.label || 'Opération');
  const subParts = isEnvoi
    ? [
        fmtDate(tx.ts),
        tx.canal || 'Non renseigné',
        tx.frais > 0 ? `Frais: ${fmtMontant(tx.frais, devise)}` : null,
        tx.motif || null,
      ].filter(Boolean)
    : [fmtDate(tx.ts), ...detail];

  return (
    <View style={s.row}>
      <View style={[s.icon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={16} color={iconColor} />
      </View>
      <View style={s.info}>
        <Text style={s.label} numberOfLines={1}>{mainLabel}</Text>
        <Text style={s.date}>
          {subParts.join(' · ')}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={[s.amount, { color: amountColor }]}>{prefix}{fmtMontant(tx.amount, devise)}</Text>
        <TouchableOpacity onPress={() => onDelete(tx.ts)} style={s.del}>
          <Ionicons name="trash-outline" size={14} color={COLORS.border} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TxList({ data, onDelete, isFuel, emptyText }) {
  const { state } = useContext(AppContext);
  const devise = state.devise || 'FCFA';
  if (!data || data.length === 0) {
    return (
      <View style={s.empty}>
        <View style={s.emptyIcon}>
          <Ionicons name="receipt-outline" size={28} color={COLORS.border} />
        </View>
        <Text style={s.emptyText}>{emptyText || 'Aucune opération'}</Text>
        <Text style={s.emptyHint}>Les transactions apparaîtront ici</Text>
      </View>
    );
  }
  return (
    <View style={s.list}>
      <FlatList
        data={[...data].reverse()}
        keyExtractor={(item) => String(item.ts)}
        renderItem={({ item, index }) => (
          <TxItem tx={item} onDelete={onDelete} isFuel={isFuel} devise={devise} />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={s.sep} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  list: { marginHorizontal: 14, marginBottom: 20, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 2 },
  date: { fontSize: 11, color: COLORS.textSecondary },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '700' },
  del: { padding: 2 },
  sep: { height: 0.5, backgroundColor: COLORS.border, marginHorizontal: 14 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 },
  emptyHint: { fontSize: 12, color: COLORS.border },
});
