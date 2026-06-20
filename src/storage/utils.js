export const COLORS = {
  primary: '#27AE60',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  bg: '#f9f9f7',
  card: '#ffffff',
  border: '#e5e5e3',
  textPrimary: '#1a1a18',
  textSecondary: '#888780',
  successBg: '#f0fdf4',
  dangerBg: '#fef2f2',
  warningBg: '#fffbeb',
  infoBg: '#eff6ff',
};

export const MODULES = {
  om: {
    key: 'om',
    name: 'Orange Money',
    icon: 'phone-portrait-outline',
    color: '#27AE60',
    actions: [
      { key: 'entree', label: 'Entrée reçue', icon: 'arrow-down-circle-outline', isPlus: true },
      { key: 'sortie', label: 'Envoi fait', icon: 'arrow-up-circle-outline', isPlus: false },
    ],
  },
  cam: {
    key: 'cam',
    name: 'Compte Cameroun',
    icon: 'location-outline',
    color: '#3b82f6',
    actions: [
      { key: 'ravit', label: 'Ravitaillement', icon: 'cash-outline', isPlus: true },
      { key: 'transfert', label: 'Transfert envoyé', icon: 'send-outline', isPlus: false },
    ],
  },
  dep: {
    key: 'dep',
    name: 'Dépenses perso',
    icon: 'receipt-outline',
    color: '#22c55e',
    actions: [
      { key: 'appro', label: 'Approvisionner', icon: 'wallet-outline', isPlus: true },
      { key: 'depense', label: 'Dépense', icon: 'cart-outline', isPlus: false },
    ],
  },
};

export function fmtMontant(n, devise = 'FCFA') {
  if (devise === 'EUR') {
    return parseFloat(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
  }
  if (devise === 'USD') {
    return '$ ' + parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
}

export function fmtLitres(n) {
  return parseFloat(n).toFixed(2) + ' L';
}

export function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function calcSolde(transactions, isFuel = false) {
  if (isFuel) {
    return transactions.reduce((s, tx) => tx.isBudget ? s + tx.amount : s - tx.amount, 0);
  }
  return transactions.reduce((s, tx) => tx.plus ? s + tx.amount : s - tx.amount, 0);
}

export function calcCreanceRestant(c) {
  const remb = (c.remboursements || []).reduce((s, r) => s + r.montant, 0);
  return c.montant - remb;
}

export function isCreanceSolde(c) {
  return !!c.cloture || calcCreanceRestant(c) <= 0;
}

export function calcLitrePer100(fuelTxs) {
  const cons = fuelTxs.filter(t => !t.isBudget);
  if (cons.length < 2) return null;
  const sorted = [...cons].sort((a, b) => a.ts - b.ts);
  const withKm = sorted.filter(t => t.km);
  if (withKm.length < 2) return null;
  const first = withKm[0];
  const last = withKm[withKm.length - 1];
  const totalKm = last.km - first.km;
  const totalL = sorted.slice(1).reduce((s, t) => s + (t.litres || 0), 0);
  if (totalKm <= 0 || totalL <= 0) return null;
  return (totalL / totalKm) * 100;
}
