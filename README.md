# Gestion App v1.0
Application Android de gestion personnelle — Orange Money, Compte Cameroun, Dépenses, Carburant.

---

## INSTALLATION ET BUILD APK — ÉTAPES COMPLÈTES

### Étape 1 — Ouvre le terminal Windows
- Appuie sur **Windows + R**, tape `cmd`, appuie sur Entrée
- Ou cherche "Invite de commandes" dans le menu Démarrer

### Étape 2 — Va dans le dossier du projet
```
cd chemin\vers\GestionApp
```
Par exemple si tu as mis le dossier sur le Bureau :
```
cd C:\Users\TonNom\Desktop\GestionApp
```

### Étape 3 — Installe les dépendances
```
npm install
```
Attends que ça finisse (2-5 minutes selon ta connexion).

### Étape 4 — Installe EAS CLI
```
npm install -g eas-cli
```

### Étape 5 — Connecte-toi à ton compte Expo
```
eas login
```
Entre ton email et mot de passe Expo quand demandé.

### Étape 6 — Lance le build APK
```
eas build --platform android --profile preview
```
- Réponds **Y** si on te demande de créer un projet
- Le build se fait dans le cloud (10-15 minutes)
- À la fin, tu reçois un **lien de téléchargement** pour ton .apk

### Étape 7 — Installe sur ton téléphone
- Télécharge le .apk depuis le lien
- Transfère-le sur ton téléphone (WhatsApp, câble USB, Google Drive...)
- Sur Android : Paramètres > Sécurité > Autoriser sources inconnues
- Ouvre le .apk et installe

---

## STRUCTURE DU PROJET
```
GestionApp/
├── App.js                    # Point d'entrée, navigation
├── app.json                  # Config Expo
├── eas.json                  # Config build APK
├── package.json              # Dépendances
└── src/
    ├── AppContext.js          # État global (Context + Reducer)
    ├── storage/
    │   ├── storage.js         # AsyncStorage (sauvegarde locale)
    │   └── utils.js           # Fonctions utilitaires + couleurs
    ├── components/
    │   ├── OpModal.js         # Modal de saisie d'opération
    │   ├── SoldeCard.js       # Carte solde réutilisable
    │   ├── TxList.js          # Liste des transactions
    │   └── FilterBar.js       # Filtres Tout/Aujourd'hui/Semaine/Mois
    └── screens/
        ├── GlobalScreen.js    # Vue globale + export Excel tout
        ├── OrangeMoneyScreen.js
        ├── CamerounScreen.js
        ├── DepensesScreen.js
        └── CarburantScreen.js # Avec lecture IA du kilométrage
```

---

## FONCTIONNALITÉS v1.0
- ✅ 4 modules indépendants : Orange Money, Cameroun, Dépenses, Carburant
- ✅ Solde en temps réel pour chaque module
- ✅ Historique des opérations avec date et remarque
- ✅ Suppression d'opération (avec confirmation)
- ✅ Filtres par période : Tout / Aujourd'hui / Semaine / Mois
- ✅ Photo tableau de bord → lecture IA du kilométrage
- ✅ Calcul automatique litres/100km
- ✅ Export Excel par module ou tout en 4 onglets
- ✅ Sauvegarde locale (données conservées sans internet)
- ✅ Mode sombre automatique selon le téléphone
