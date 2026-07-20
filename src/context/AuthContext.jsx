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
  
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onGoogleLoginSuccess((token) => {
        const credential = GoogleAuthProvider.credential(token);
        signInWithCredential(auth, credential).catch(err => {
          console.error("Desktop Google Login Error:", err);
        });
      });
      return () => {
        window.electronAPI.removeGoogleLoginListener();
      };
    }
  }, []);

  const loginWithGoogle = () => {
    if (window.electronAPI) {
      window.electronAPI.startGoogleLogin();
      return Promise.resolve(); // Resolves immediately, actual login happens via IPC
    }
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };
  
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, login, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
