import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAf0hMuMkbHgbp0-a50nmQPjy7AbPVi1Xk',
  authDomain: 'texpainting-bid.firebaseapp.com',
  projectId: 'texpainting-bid',
  storageBucket: 'texpainting-bid.firebasestorage.app',
  messagingSenderId: '980957288070',
  appId: '1:980957288070:web:33e19e17d6e51e9b39e307',
};

// Guard against duplicate initialization (Vite HMR re-runs module code)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection every time
googleProvider.setCustomParameters({ prompt: 'select_account' });
