// MOCK FIREBASE CONFIGURATION
// Since we are migrating away from Firebase, this file provides stub implementations 
// so that dashboard components can compile without breaking the build while we migrate them.
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "dummy",
  authDomain: "dummy.firebaseapp.com",
  projectId: "dummy",
  storageBucket: "dummy.firebasestorage.app",
  messagingSenderId: "123",
  appId: "123"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  WRITE = 'WRITE'
}

export const handleFirestoreError = (error: any, type: OperationType, collection: string) => {
  console.warn(`[Migrating] Mock Firebase error handled: ${type} on ${collection}`);
};
