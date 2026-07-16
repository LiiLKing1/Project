import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const RolesContext = createContext();
export const useRoles = () => useContext(RolesContext);

export const DEFAULT_ROLES = {
  admin: { name: 'Admin', permissions: { dashboard: true, products: true, sales: true, customers: true, marketing: true, reports: true, finance: true, management: true, settings: true, importExport: true } },
  kassir: { name: 'Kassir', permissions: { dashboard: true, products: false, sales: true, customers: true, marketing: false, reports: false, finance: false, management: false, settings: false, importExport: false } },
};

export const RolesProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : null;
  });
  const [roles, setRoles] = useState(() => {
    const saved = localStorage.getItem('roles');
    return saved ? JSON.parse(saved) : DEFAULT_ROLES;
  });
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    const saved = localStorage.getItem('hasOnboarded');
    return saved ? JSON.parse(saved) : false;
  });
  const [loadingRoles, setLoadingRoles] = useState(() => !localStorage.getItem('userProfile'));

  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
    } else {
      setUserProfile(null);
      setRoles(DEFAULT_ROLES);
      setHasOnboarded(false);
      setLoadingRoles(false);
    }
  }, [currentUser]);

  const loadUserProfile = async () => {
    try {
      const adminProfileRef = doc(db, `users/${currentUser.uid}/profile/info`);
      const adminProfileSnap = await getDoc(adminProfileRef);

      if (adminProfileSnap.exists()) {
        const profileData = adminProfileSnap.data();
        profileData.storeOwnerId = profileData.storeOwnerId || currentUser.uid;
        setUserProfile(profileData);
        localStorage.setItem('userProfile', JSON.stringify(profileData));
        
        const storeOwnerId = profileData.storeOwnerId || currentUser.uid;
        
        // Check onboarding state
        const storeInfoRef = doc(db, `users/${storeOwnerId}/settings/storeInfo`);
        const storeInfoSnap = await getDoc(storeInfoRef);
        const onboarded = storeInfoSnap.exists();
        setHasOnboarded(onboarded);
        localStorage.setItem('hasOnboarded', JSON.stringify(onboarded));

        const rolesRef = doc(db, `users/${storeOwnerId}/settings/roles`);
        const rolesSnap = await getDoc(rolesRef);
        
        if (rolesSnap.exists()) {
          const dbRoles = rolesSnap.data();
          const mergedRoles = { ...DEFAULT_ROLES };
          
          Object.keys(dbRoles).forEach(roleKey => {
            if (mergedRoles[roleKey] && typeof dbRoles[roleKey] === 'object') {
              mergedRoles[roleKey] = {
                ...mergedRoles[roleKey],
                ...dbRoles[roleKey],
                permissions: {
                  ...mergedRoles[roleKey].permissions,
                  ...(dbRoles[roleKey].permissions || {})
                }
              };
            }
          });
          
          setRoles(mergedRoles);
          localStorage.setItem('roles', JSON.stringify(mergedRoles));
        } else if (!profileData.storeOwnerId) {
          await setDoc(rolesRef, DEFAULT_ROLES);
        }
      } else {
        const newAdminProfile = {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin',
          email: currentUser.email,
          role: 'admin',
          storeOwnerId: currentUser.uid,
          createdAt: new Date().toISOString()
        };
        await setDoc(adminProfileRef, newAdminProfile);
        setUserProfile(newAdminProfile);
        localStorage.setItem('userProfile', JSON.stringify(newAdminProfile));
        
        const rolesRef = doc(db, `users/${currentUser.uid}/settings/roles`);
        await setDoc(rolesRef, DEFAULT_ROLES);
        
        setHasOnboarded(false); // Newly created user hasn't onboarded
        localStorage.setItem('hasOnboarded', JSON.stringify(false));
      }
    } catch (error) {
      console.error("Profil yuklash xatosi:", error);
      const fallbackProfile = { role: 'admin', name: currentUser?.email || 'Admin', storeOwnerId: currentUser.uid };
      setUserProfile(fallbackProfile);
    } finally {
      setLoadingRoles(false);
    }
  };

  const hasPermission = (permKey) => {
    // Agar tizimga kirmagan bo'lsak (MVP test rejimi) hamma bo'lim ochiq bo'ladi
    if (!userProfile) {
      if (!currentUser) return true;
      return false;
    }
    
    const normalizedRole = (userProfile.role || (userProfile.storeOwnerId ? 'kassir' : 'admin')).toLowerCase();
    
    // Asosiy admin egasi uchun barcha ruxsatlar ochiq
    if (normalizedRole === 'admin' && !userProfile.storeOwnerId) return true;
    
    // Maxsus belgilangan huquqlar birinchi tekshiriladi
    if (userProfile.permissions && userProfile.permissions[permKey] !== undefined) {
      return userProfile.permissions[permKey] === true;
    }

    const currentRole = roles[normalizedRole] || DEFAULT_ROLES[normalizedRole];
    if (!currentRole) return false;
    
    // Agar ruxsat aniq ko'rsatilmagan bo'lsa (masalan bazada yo'q), default roldan qidiramiz
    const perm = currentRole.permissions?.[permKey];
    if (perm !== undefined) return perm === true;
    
    return DEFAULT_ROLES[normalizedRole]?.permissions?.[permKey] === true;
  };

  return (
    <RolesContext.Provider value={{ userProfile, roles, loadingRoles, hasPermission, hasOnboarded }}>
      {children}
    </RolesContext.Provider>
  );
};
