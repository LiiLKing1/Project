import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from '../services/firebaseMock';
import { useRoles } from './RolesContext';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'uz',
    currency: 'UZS',
    showUsdConversion: false,
    usdRate: 12500,
    rubRate: 140,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, `users/${storeId}/settings/general`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(prev => ({ ...prev, ...data }));
        
        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', data.theme || 'light');
      } else {
        // If doesn't exist, create defaults
        setDoc(docRef, settings, { merge: true });
        document.documentElement.setAttribute('data-theme', settings.theme);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [storeId]);

  const updateSettings = async (newUpdates) => {
    if (!storeId) return;
    const docRef = doc(db, `users/${storeId}/settings/general`);
    await setDoc(docRef, newUpdates, { merge: true });
    
    if (newUpdates.theme) {
      document.documentElement.setAttribute('data-theme', newUpdates.theme);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
