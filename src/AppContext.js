import React, { createContext, useReducer, useEffect } from 'react';
import { loadState, saveState } from './storage/storage';

export const AppContext = createContext();

const defaultState = { cam: [], dep: [], fuel: [], creances: [], prixLitre: 0, budgetMensuel: 0, devise: 'FCFA' };

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
