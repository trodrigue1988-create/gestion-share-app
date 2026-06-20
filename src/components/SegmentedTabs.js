import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../storage/utils';

export default function SegmentedTabs({ tabs, active, onChange }) {
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {tabs.map(t => {
          const isActive = active === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.btn, isActive && s.btnActive]}
              onPress={() => onChange(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.txt, isActive && s.txtActive]} numberOfLines={1}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: 14, marginBottom: 12 },
  row: { flexDirection: 'row', backgroundColor: COLORS.bg, borderRadius: 14, padding: 4, gap: 4, borderWidth: 0.5, borderColor: COLORS.border },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  btnActive: {
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  txt: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  txtActive: { color: COLORS.primary, fontWeight: '700' },
});
