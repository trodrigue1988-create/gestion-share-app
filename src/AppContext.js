import React, { createContext, useReducer, useEffect } from 'react';
import { loadState, saveState } from './storage/storage';

export const AppContext = createContext();

const CAT_DEP_DEFAUT = [
  { key: 'perso', label: 'Perso', icon: 'person-outline', color: '#3b82f6' },
  { key: 'chargesFixes', label: 'Charg Fix', icon: 'home-outline', color: '#f59e0b' },
  { key: 'autres', label: 'Autres', icon: 'ellipsis-horizontal-circle-outline', color: '#9b59b6' },
];

const defaultState = {
  cam: [], envois: [], dep: [], fuel: [], creances: [],
  prixLitre: 0, budgetMensuel: 0, devise: 'FCFA',
  destinatairesFrequents: [],
  canauxFrequents: ['Western Union', 'Mobile Money', 'Virement bancaire', 'Autre'],
  categoriesDepenses: CAT_DEP_DEFAUT,
  budgetsParCategorie: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': return { ...state, ...action.payload };
    case 'ADD_TX': return { ...state, [action.mod]: [...state[action.mod], action.tx] };
    case 'DEL_TX': return { ...state, [action.mod]: state[action.mod].filter(tx => tx.ts !== action.ts) };
    case 'ADD_FUEL': return { ...state, fuel: [...state.fuel, action.tx] };
    case 'DEL_FUEL': return { ...state, fuel: state.fuel.filter(tx => tx.ts !== action.ts) };
    case 'SET_PRIX': return { ...state, prixLitre: action.prix };
    case 'SET_BUDGET_MENSUEL': return { ...state, budgetMensuel: action.montant };
    case 'SET_DEVISE': return { ...state, devise: action.devise };
    case 'ADD_CREANCE': return { ...state, creances: [...state.creances, action.creance] };
    case 'DEL_CREANCE': return { ...state, creances: state.creances.filter(c => c.id !== action.id) };
    case 'ADD_REMB': return {
      ...state,
      creances: state.creances.map(c => c.id === action.id
        ? { ...c, remboursements: [...c.remboursements, action.remb] }
        : c)
    };
    case 'DEL_REMB': return {
      ...state,
      creances: state.creances.map(c => c.id === action.id
        ? { ...c, remboursements: c.remboursements.filter(r => r.ts !== action.ts) }
        : c)
    };
    case 'TOGGLE_CLOTURE': return {
      ...state,
      creances: state.creances.map(c => c.id === action.id ? { ...c, cloture: !c.cloture } : c)
    };
    case 'ADD_DEST': return {
      ...state,
      destinatairesFrequents: state.destinatairesFrequents.includes(action.nom)
        ? state.destinatairesFrequents
        : [...state.destinatairesFrequents, action.nom]
    };
    case 'DEL_DEST': return {
      ...state,
      destinatairesFrequents: state.destinatairesFrequents.filter(n => n !== action.nom)
    };
    case 'ADD_CANAL': return {
      ...state,
      canauxFrequents: state.canauxFrequents.includes(action.nom)
        ? state.canauxFrequents
        : [...state.canauxFrequents, action.nom]
    };
    case 'DEL_CANAL': return {
      ...state,
      canauxFrequents: state.canauxFrequents.filter(n => n !== action.nom)
    };
    case 'ADD_CATEGORIE': return {
      ...state,
      categoriesDepenses: [...state.categoriesDepenses, action.cat],
    };
    case 'EDIT_CATEGORIE': return {
      ...state,
      categoriesDepenses: state.categoriesDepenses.map(c => c.key === action.key ? { ...c, ...action.changes } : c),
    };
    case 'DEL_CATEGORIE': return {
      ...state,
      categoriesDepenses: state.categoriesDepenses.filter(c => c.key !== action.key),
    };
    case 'SET_BUDGET_CATEGORIE': return {
      ...state,
      budgetsParCategorie: { ...state.budgetsParCategorie, [action.catKey]: action.montant },
    };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    loadState().then(data => dispatch({ type: 'LOAD', payload: data }));
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
