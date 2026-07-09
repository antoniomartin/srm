/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  serverTimestamp,
  getDocFromServer,
  FirestoreError
} from 'firebase/firestore';

// Default Firebase Config (the user's project)
const firebaseConfig = {
  apiKey: "AIzaSyBz4x-M0SUWOSnL86sdN44vVBhKXakrJFY",
  authDomain: "my-srm-82dfc.firebaseapp.com",
  projectId: "my-srm-82dfc",
  storageBucket: "my-srm-82dfc.firebasestorage.app",
  messagingSenderId: "400960013428",
  appId: "1:400960013428:web:de159b0828b17c8a1e3d21"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or connection.");
    }
  }
}

// Path helper
export function getUserCollectionPath(colName: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User must be authenticated to access Firestore.");
  return `users/${uid}/${colName}`;
}

// Check offline status helper
export function isOfflineError(error: any): boolean {
  return error && error.code === 'unavailable';
}
