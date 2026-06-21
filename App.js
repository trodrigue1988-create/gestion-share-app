import React, { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/AppContext';
import { AuthContext } from './src/auth/AuthContext';
import LockScreen from './src/auth/LockScreen';
import GlobalScreen from './src/screens/GlobalScreen';
import DepensesScreen from './src/screens/DepensesScreen';
import EnvoiExtScreen from './src/screens/EnvoiExtScreen';
import CreancesScreen from './src/screens/CreancesScreen';
import CarburantScreen from './src/screens/CarburantScreen';

const Tab = createBottomTabNavigator();
const PRIMARY = '#27AE60';
const GRAY = '#888780';

function MainTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color }) => {
            const icons = {
              Global: focused ? 'grid' : 'grid-outline',
              Dépenses: focused ? 'receipt' : 'receipt-outline',
              'Envoi Ext.': focused ? 'send' : 'send-outline',
              Créances: focused ? 'people' : 'people-outline',
              Carburant: focused ? 'car' : 'car-outline',
            };
            return <Ionicons name={icons[route.name]} size={22} color={color} />;
          },
          tabBarActiveTintColor: PRIMARY,
          tabBarInactiveTintColor: GRAY,
          tabBarStyle: {
            borderTopWidth: 0.5,
            borderTopColor: '#e5e5e3',
            paddingBottom: 6,
            paddingTop: 6,
            height: 64,
            backgroundColor: '#fff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
          headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: '#e5e5e3' },
          headerTitleStyle: { fontSize: 16, fontWeight: '700', color: '#1a1a18' },
          headerTintColor: PRIMARY,
        })}
      >
        <Tab.Screen name="Global" component={GlobalScreen} options={{ title: 'Vue globale', headerTitle: 'Vue globale' }} />
        <Tab.Screen name="Dépenses" component={DepensesScreen} options={{ headerTitle: 'Dépenses' }} />
        <Tab.Screen name="Envoi Ext." component={EnvoiExtScreen} options={{ headerTitle: 'Envoi Extérieur' }} />
        <Tab.Screen name="Créances" component={CreancesScreen} options={{ headerTitle: 'Créances' }} />
        <Tab.Screen name="Carburant" component={CarburantScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const verrouSuspendu = useRef(false);
  const suspendTimer = useRef(null);

  function suspendreVerrouillage(actif = true) {
    if (suspendTimer.current) clearTimeout(suspendTimer.current);
    if (actif) {
      verrouSuspendu.current = true;
      // filet de sécurité : 2 minutes max si jamais false n'est jamais appelé
      suspendTimer.current = setTimeout(() => { verrouSuspendu.current = false; }, 120000);
    } else {
      verrouSuspendu.current = false;
    }
  }

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current === 'active' && nextState !== 'active') {
        if (!verrouSuspendu.current) setUnlocked(false);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  return (
    <AppProvider>
      <AuthContext.Provider value={{ lock: () => setUnlocked(false), suspendreVerrouillage }}>
        <StatusBar style="dark" />
        {unlocked ? <MainTabs /> : <LockScreen onUnlock={() => setUnlocked(true)} />}
      </AuthContext.Provider>
    </AppProvider>
  );
}
