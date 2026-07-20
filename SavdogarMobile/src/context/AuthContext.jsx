import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('authUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('authUser'));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = { uid: user.uid, email: user.email, displayName: user.displayName };
        setCurrentUser(userData); // Save simplified object, full user objects are large
        localStorage.setItem('authUser', JSON.stringify(userData));
      } else {
        setCurrentUser(null);
        localStorage.removeItem('authUser');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('roles');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  
  const loginWithGoogle = () => {
    return new Promise((resolve, reject) => {
      if (window.electronAPI && window.electronAPI.isElectron) {
        // Open Google Login in external default browser
        window.electronAPI.onGoogleLoginSuccess((idToken) => {
          window.electronAPI.removeGoogleLoginListener();
          const credential = GoogleAuthProvider.credential(idToken);
          signInWithCredential(auth, credential)
            .then(resolve)
            .catch(reject);
        });
        window.electronAPI.startGoogleLogin();
      } else {
        // Standard web popup
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).then(resolve).catch(reject);
      }
    });
  };
  
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, login, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
