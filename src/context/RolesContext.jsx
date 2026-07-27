import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from '../services/firebaseMock';
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
      // Clear localStorage if UID doesn't match
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email !== currentUser.email) {
          localStorage.removeItem('userProfile');
          setUserProfile(null);
          setLoadingRoles(true);
        }
      } else {
        setLoadingRoles(true);
      }
      loadUserProfile();
    } else {
      setUserProfile({ role: 'admin', storeOwnerId: 'demo-store', name: 'Demo User' });
      setRoles(DEFAULT_ROLES);
      setHasOnboarded(true);
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
        const storeOwnerId = profileData.storeOwnerId || currentUser.uid;
        
        // Fetch the main user doc to get business status (pending, active, blocked)
        const ownerDocRef = doc(db, `users/${storeOwnerId}`);
        const ownerDocSnap = await getDoc(ownerDocRef);
        if (ownerDocSnap.exists()) {
          profileData.status = ownerDocSnap.data().status || 'pending'; // Default to pending if missing
          profileData.emailVerified = ownerDocSnap.data().emailVerified || currentUser.emailVerified;
        } else {
          // If root doc doesn't exist, they are definitely pending and we should create it
          profileData.status = 'pending';
          await setDoc(ownerDocRef, {
            email: profileData.email || currentUser.email,
            displayName: profileData.name || currentUser.displayName || 'Admin',
            role: 'owner',
            status: 'pending',
            emailVerified: currentUser?.emailVerified || false,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
        
        setUserProfile(profileData);
        localStorage.setItem('userProfile', JSON.stringify(profileData));

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
        const ownerDocRef = doc(db, `users/${currentUser.uid}`);
        const ownerDocSnap = await getDoc(ownerDocRef);
        let status = 'pending';

        if (!ownerDocSnap.exists()) {
          const pendingData = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin',
            role: 'owner',
            status: 'pending',
            emailVerified: currentUser.emailVerified || false,
            createdAt: new Date().toISOString()
          };
          
          // Tizimga birinchi marta kirganda Firebase'ga yozilmaydi, Drive'dagi pending_users ga yoziladi
          if (window.electronAPI && window.electronAPI.syncToDrive) {
            window.electronAPI.syncToDrive({
              storeId: 'admin',
              collectionName: 'pending_users',
              docId: currentUser.uid,
              action: 'CREATE',
              data: pendingData
            });
          } else {
            // Vercel orqali brauzerdan Drive'ga yozish
            try {
              await fetch('/api/register-pending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userData: pendingData })
              });
            } catch (err) {
              console.error("Vercel API xatosi:", err);
            }
          }
        } else {
          status = ownerDocSnap.data().status || 'pending';
        }

        const newAdminProfile = {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin',
          email: currentUser.email,
          role: 'admin',
          storeOwnerId: currentUser.uid,
          status: status,
          emailVerified: ownerDocSnap.exists() ? ownerDocSnap.data().emailVerified : (currentUser.emailVerified || false),
          createdAt: new Date().toISOString()
        };
        
        // Tizimda mavjud bo'lmasa, profillarni ham faqat Drive ga tashlaymiz yoki o'tkazib yuboramiz.
        if (ownerDocSnap.exists()) {
          await setDoc(adminProfileRef, newAdminProfile);
          const rolesRef = doc(db, `users/${currentUser.uid}/settings/roles`);
          await setDoc(rolesRef, DEFAULT_ROLES);
        }

        setUserProfile(newAdminProfile);
        localStorage.setItem('userProfile', JSON.stringify(newAdminProfile));
        
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
