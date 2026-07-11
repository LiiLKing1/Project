import { useAuth } from './AuthContext';
import { useRoles } from './RolesContext';

/**
 * Bu hook barcha sahifalarda Firestore yo'lini to'g'ri qaytaradi.
 * Admin: o'z UID si bo'yicha o'qiydi
 * Xodim (storeOwnerId bor): adminning UID si bo'yicha o'qiydi
 */
export const useStoreId = () => {
  const { currentUser } = useAuth();
  const { userProfile } = useRoles();

  if (!currentUser) return null;
  // Agar xodim bo'lsa, storeOwnerId (admin uid) qaytaradi
  // Agar admin bo'lsa, o'z uid qaytaradi
  return userProfile?.storeOwnerId || currentUser.uid;
};
