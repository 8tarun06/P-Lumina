import { useState, useEffect } from 'react';
import { auth } from '../../../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

export const useAdminAuth = () => {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check admin status on auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminDoc = await getDoc(doc(db, 'adminUsers', user.uid));
        setAdminUser(adminDoc.exists() ? { ...user, ...adminDoc.data() } : null);
      } else {
        setAdminUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Check admin privileges in Firestore
      const adminDoc = await getDoc(doc(db, 'adminUsers', userCredential.user.uid));
      
      if (!adminDoc.exists()) {
        await signOut(auth);
        throw new Error('Not authorized as admin');
      }
      
      return {
        user: userCredential.user,
        adminData: adminDoc.data()
      };
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { adminUser, loading, login, logout };
};