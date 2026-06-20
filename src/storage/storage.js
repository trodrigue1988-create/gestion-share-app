import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gestion_share_v1';

const defaultState = {
  cam: [],
  dep: [],
  fuel: [],
  creances: [],
  prixLitre: 0,
  budgetMensuel: 0,
  devise: 'FCFA',
};

export async function loadState() {
  try {
    const data = await AsyncStorage.getItem(KEY);
    if (!data) return defaultState;
    const merged = { ...defaultState, ...JSON.parse(data) };
    merged.dep = (merged.dep || []).map(tx => ({ ...tx, cat: tx.cat || 'perso' }));
    merged.creances = (merged.creances || []).map(c => ({ ...c, remboursements: c.remboursements || [] }));
    return merged;
  } catch (e) {
    return defaultState;
  }
}

export async function saveState(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {}
}
