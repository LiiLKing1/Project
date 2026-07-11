import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const RolesContext = createContext();
export const useRoles = () => useContext(RolesContext);

// Default rollar va ularning huquqlari
export const DEFAULT_ROLES = {
  admin: {
    name: 'Admin',
    permissions: {
      dashboard: true,
      products: true,
      sales: true,
      customers: true,
      reports: true,
      finance: true,
      marketing: true,
      management: true,
      settings: true,
    }
  },
  kassir: {
    name: 'Kassir',
    permissions: {
      dashboard: true,
      products: false,
      sales: true,
      customers: true,
      reports: false,
      finance: false,
      marketing: false,
      management: false,
      settings: false,
    }
  },
  omborchi: {
    name: 'Omborchi',
    permissions: {
      dashboard: true,
      products: true,
      sales: false,
      customers: false,
      reports: false,
      finance: false,
      marketing: false,
      management: false,
      settings: false,
    }
  },
  menejer: {
    name: 'Menejer',
    permissions: {
      dashboard: true,
      products: true,
      sales: true,
      customers: true,
      reports: true,
      finance: false,
      marketing: true,
      management: false,
      settings: false,
    }
  },
  yetkazuvchi: {
    name: 'Yetkazib beruvchi',
    permissions: {
      dashboard: false,
      products: true,
      sales: false,
      customers: false,
      reports: false,
      finance: false,
      marketing: false,
      management: false,
      settings: false,
    }
  }
};

export const PERMISSION_LABELS = {
  dashboard: "Dashboard (Bosh sahifa)",
  products: "Mahsulotlar bo'limi",
  sales: "Sotuvlar bo'limi",
  customers: "Mijozlar bo'limi",
  reports: "Hisobotlar",
  finance: "Moliyalashtirish",
  marketing: "Marketing",
  management: "Boshqaruv (Xodimlar/Rollar)",
  settings: "Sozlamalar",
};

export const RolesProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      setLoadingRoles(false);
      return;
    }
    loadUserProfile();
  }, [currentUser]);

  const loadUserProfile = async () => {
    try {
      const adminProfileRef = doc(db, `users/${currentUser.uid}/profile/info`);
      const adminProfileSnap = await getDoc(adminProfileRef);

      if (adminProfileSnap.exists()) {
        const profileData = adminProfileSnap.data();
        setUserProfile(profileData);

        // Bu xodim bo'lsa, uning storeOwner admining rollarini yuklash kerak
        const storeOwnerId = profileData.storeOwnerId || currentUser.uid;
        const rolesRef = doc(db, `users/${storeOwnerId}/settings/roles`);
        const rolesSnap = await getDoc(rolesRef);
        if (rolesSnap.exists()) {
          setRoles({ ...DEFAULT_ROLES, ...rolesSnap.data() });
        } else if (!profileData.storeOwnerId) {
          // Bu admin, birinchi marta kirgan: default rollarni saqlash
          await setDoc(rolesRef, DEFAULT_ROLES);
        }
      } else {
        // Birinchi marta kirgan admin
        const newAdminProfile = {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Foydalanuvchi',
          email: currentUser.email,
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        await setDoc(adminProfileRef, newAdminProfile);
        setUserProfile(newAdminProfile);

        // Default rollarni saqlash
        const rolesRef = doc(db, `users/${currentUser.uid}/settings/roles`);
        await setDoc(rolesRef, DEFAULT_ROLES);
      }
    } catch (error) {
      console.error("Profil yuklashda xatolik:", error);
      setUserProfile((prev) => prev || { role: 'admin', name: currentUser?.email || 'Admin' });
    } finally {
      setLoadingRoles(false);
    }
  };

  const hasPermission = (permKey) => {
    if (!userProfile) return false;
    // Admin va storeOwnerId bo'lmaganlar hamma narsaga kirishi mumkin
    if (userProfile.role === 'admin' && !userProfile.storeOwnerId) return true;
    const role = userProfile.role;
    const currentRole = roles[role];
    if (!currentRole) return false;
    return currentRole.permissions[permKey] === true;
  };

  const updateRoles = async (newRoles) => {
    if (!currentUser) return;
    try {
      const storeOwnerId = userProfile?.storeOwnerId || currentUser.uid;
      const rolesRef = doc(db, `users/${storeOwnerId}/settings/roles`);
      await setDoc(rolesRef, newRoles);
      setRoles(newRoles);
    } catch (error) {
      console.error("Rollarni yangilashda xatolik:", error);
    }
  };

  return (
    <RolesContext.Provider value={{ userProfile, roles, loadingRoles, hasPermission, updateRoles, loadUserProfile }}>
      {children}
    </RolesContext.Provider>
  );
};
