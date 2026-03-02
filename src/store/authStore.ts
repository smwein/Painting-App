import { create } from 'zustand';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from '../config/firebase';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
}

export interface UserRecord {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void; // returns unsubscribe function
  fetchAllUsers: () => Promise<UserRecord[]>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
}

const ALLOWED_DOMAIN = 'texpainting.com';

async function getUserRole(uid: string, email: string): Promise<UserRole> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().role as UserRole;
  }

  // First-time user: create record with default 'user' role
  // Manually set role to 'admin' in Firestore for admins
  const newUser = {
    email,
    role: 'user' as UserRole,
    createdAt: new Date().toISOString(),
  };
  await setDoc(userRef, newUser);
  return 'user';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser || !firebaseUser.email) {
        set({ user: null, loading: false });
        return;
      }

      const emailDomain = firebaseUser.email.split('@')[1];
      if (emailDomain !== ALLOWED_DOMAIN) {
        // Sign out and reject — wrong domain
        await firebaseSignOut(auth);
        set({
          user: null,
          loading: false,
          error: `Access restricted to ${ALLOWED_DOMAIN} accounts.`,
        });
        return;
      }

      try {
        const role = await getUserRole(firebaseUser.uid, firebaseUser.email);
        set({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            role,
          },
          loading: false,
          error: null,
        });
      } catch {
        set({ user: null, loading: false, error: 'Failed to load user profile.' });
      }
    });

    return unsubscribe;
  },

  signInWithGoogle: async () => {
    set({ error: null });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email ?? '';
      const emailDomain = email.split('@')[1];

      if (emailDomain !== ALLOWED_DOMAIN) {
        await firebaseSignOut(auth);
        set({ error: `Access restricted to ${ALLOWED_DOMAIN} accounts.` });
        return;
      }
      // onAuthStateChanged will handle setting the user state
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed.';
      // Ignore popup-closed-by-user error
      if (!message.includes('popup-closed-by-user') && !message.includes('cancelled-popup-request')) {
        set({ error: message });
      }
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    set({ user: null });
  },

  clearError: () => set({ error: null }),

  fetchAllUsers: async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((d) => ({
      uid: d.id,
      email: d.data().email ?? '',
      role: (d.data().role ?? 'user') as UserRole,
      createdAt: d.data().createdAt ?? '',
    }));
  },

  updateUserRole: async (uid: string, role: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role });
  },
}));
