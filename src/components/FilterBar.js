import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../storage/utils';

const FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
];

export default function FilterBar({ active, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.row} contentContainerStyle={s.content}>
      {FILTERS.map(f => {
        const isActive = active === f.key;
        return (
          <TouchableOpacity
            key={f.key}
            style={[s.btn, isActive && s.btnActive]}
            onPress={() => onChange(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.txt, isActive && s.txtActive]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function applyFilter(txs, filter) {
  const now = new Date();
  return txs.filter(tx => {
    if (filter === 'all') return true;
    const d = new Date(tx.ts);
    if (filter === 'today') return d.toDateString() === now.toDateString();
    if (filter === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

const s = StyleSheet.create({
  row: { paddingHorizontal: 14, marginBottom: 12 },
  content: { gap: 6, paddingRight: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.bg, borderWidth: 0.5, borderColor: COLORS.border },
  btnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  txt: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  txtActive: { color: '#fff', fontWeight: '600' },
});
