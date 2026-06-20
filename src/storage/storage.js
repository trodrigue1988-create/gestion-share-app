import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gestion_share_v1';

const CANAUX_DEFAUT = ['Western Union', 'Mobile Money', 'Virement bancaire', 'Autre'];

const defaultState = {
  cam: [],
  envois: [],
  dep: [],
  fuel: [],
  creances: [],
  prixLitre: 0,
  budgetMensuel: 0,
  devise: 'FCFA',
  destinatairesFrequents: [],
  canauxFrequents: CANAUX_DEFAUT,
};

export async function loadState() {
  try {
    const data = await AsyncStorage.getItem(KEY);
    if (!data) return defaultState;
    const merged = { ...defaultState, ...JSON.parse(data) };
    merged.dep = (merged.dep || []).map(tx => ({ ...tx, cat: tx.cat || 'perso' }));
    merged.creances = (merged.creances || []).map(c => ({ ...c, remboursements: c.remboursements || [] }));
    // Migration des anciennes transactions cam → envois
    const camTxs = merged.cam || [];
    merged.envois = merged.envois || [];
    const envoisTs = new Set(merged.envois.map(t => t.ts));
    for (const tx of camTxs) {
      if (!envoisTs.has(tx.ts)) merged.envois.push(tx);
    }
    merged.cam = [];
    merged.destinatairesFrequents = merged.destinatairesFrequents || [];
    merged.canauxFrequents = merged.canauxFrequents && merged.canauxFrequents.length > 0
      ? merged.canauxFrequents
      : CANAUX_DEFAUT;
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
