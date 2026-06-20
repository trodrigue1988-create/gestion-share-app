import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gestion_share_v1';

const CANAUX_DEFAUT = ['Western Union', 'Mobile Money', 'Virement bancaire', 'Autre'];

const CAT_DEP_DEFAUT = [
  { key: 'perso', label: 'Perso', icon: 'person-outline', color: '#3b82f6' },
  { key: 'chargesFixes', label: 'Charg Fix', icon: 'home-outline', color: '#f59e0b' },
  { key: 'autres', label: 'Autres', icon: 'ellipsis-horizontal-circle-outline', color: '#9b59b6' },
];

const VEHICULE_DEFAUT_ID = 'v_default';
const VEHICULE_DEFAUT = { id: VEHICULE_DEFAUT_ID, nom: 'Mon véhicule', intervalleEntretien: 5000, dernierEntretienKm: 0 };

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
  categoriesDepenses: CAT_DEP_DEFAUT,
  budgetsParCategorie: {},
  vehicules: [VEHICULE_DEFAUT],
  vehiculeActif: VEHICULE_DEFAUT_ID,
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
    merged.categoriesDepenses = merged.categoriesDepenses && merged.categoriesDepenses.length > 0
      ? merged.categoriesDepenses
      : CAT_DEP_DEFAUT;
    merged.budgetsParCategorie = merged.budgetsParCategorie || {};
    // Migration véhicules
    if (!merged.vehicules || merged.vehicules.length === 0) {
      merged.vehicules = [VEHICULE_DEFAUT];
    } else {
      // S'assurer que chaque véhicule a les nouveaux champs
      merged.vehicules = merged.vehicules.map(v => ({
        intervalleEntretien: 5000, dernierEntretienKm: 0, ...v,
      }));
    }
    merged.vehiculeActif = merged.vehiculeActif || VEHICULE_DEFAUT_ID;
    // Assigner les transactions fuel sans vehiculeId au véhicule par défaut
    merged.fuel = (merged.fuel || []).map(tx =>
      tx.vehiculeId ? tx : { ...tx, vehiculeId: VEHICULE_DEFAUT_ID }
    );
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
