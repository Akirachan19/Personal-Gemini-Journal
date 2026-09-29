/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import type { JournalInteraction, NotificationSettings, NotificationLog, NotificationPayloadDirective, NotificationDispatchResult } from './types';
import firebaseConfigJson from '../firebase-applet-config.json';

// Initialize Firebase App
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigJson.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigJson.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigJson.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigJson.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigJson.appId || import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const databaseId = firebaseConfigJson.firestoreDatabaseId;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

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
  };
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
  console.warn('Firestore Operation Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Strict undefined stripping utility to ensure zero payload rejections in Firestore
 */
export function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out current user
 */
export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Listen for user auth state changes
 */
export function onUserAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Owner-isolated Firestore: Get interaction collection ref for a user
 * Path: /users/{userId}/interactions
 */
function getUserInteractionsCollection(userId: string) {
  if (!userId) throw new Error('User ID is required to access interactions');
  return collection(db, 'users', userId, 'interactions');
}

/**
 * Persist an interaction with strict undefined stripping and user isolation
 */
export async function saveInteractionToFirestore(
  userId: string, 
  interaction: JournalInteraction
): Promise<void> {
  if (!userId) throw new Error('User must be authenticated to save');
  const path = `users/${userId}/interactions/${interaction.id}`;
  try {
    const userInteractionsCol = getUserInteractionsCollection(userId);
    const docRef = doc(userInteractionsCol, interaction.id);
    const sanitized = sanitizePayload(interaction);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Delete an interaction
 */
export async function deleteInteractionFromFirestore(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId) throw new Error('User must be authenticated to delete');
  const path = `users/${userId}/interactions/${interactionId}`;
  try {
    const userInteractionsCol = getUserInteractionsCollection(userId);
    const docRef = doc(userInteractionsCol, interactionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Real-time subscription to user-isolated interactions
 */
export function subscribeToUserInteractions(
  userId: string,
  onUpdate: (interactions: JournalInteraction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const path = `users/${userId}/interactions`;
  const colRef = getUserInteractionsCollection(userId);
  const q = query(colRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as JournalInteraction);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Default Notification Settings Template
 */
export function getDefaultNotificationSettings(userId: string): NotificationSettings {
  return {
    id: 'default',
    userId,
    slackEnabled: false,
    slackWebhookUrl: '',
    discordEnabled: false,
    discordWebhookUrl: '',
    emailEnabled: false,
    emailAddress: '',
    emailWebhookUrl: '',
    triggerMode: 'summarize',
    filterKeywords: ['Action Items', 'Breakthrough', 'Goal', 'Important'],
    updatedAt: Date.now(),
  };
}

/**
 * Save user notification settings to Firestore
 * Path: /users/{userId}/notificationSettings/default
 */
export async function saveNotificationSettingsToFirestore(
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  if (!userId) throw new Error('User must be authenticated to update settings');
  const path = `users/${userId}/notificationSettings/default`;
  try {
    const docRef = doc(db, 'users', userId, 'notificationSettings', 'default');
    const sanitized = sanitizePayload({
      ...settings,
      userId,
      updatedAt: Date.now(),
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Subscribe to user notification settings
 */
export function subscribeToNotificationSettings(
  userId: string,
  onUpdate: (settings: NotificationSettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    return () => {};
  }

  const path = `users/${userId}/notificationSettings/default`;
  const docRef = doc(db, 'users', userId, 'notificationSettings', 'default');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as NotificationSettings);
      } else {
        onUpdate(getDefaultNotificationSettings(userId));
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      onUpdate(getDefaultNotificationSettings(userId));
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Save notification dispatch audit log
 * Path: /users/{userId}/notificationLogs/{logId}
 */
export async function saveNotificationLogToFirestore(
  userId: string,
  log: NotificationLog
): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}/notificationLogs/${log.id}`;
  try {
    const colRef = collection(db, 'users', userId, 'notificationLogs');
    const docRef = doc(colRef, log.id);
    await setDoc(docRef, sanitizePayload(log));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

/**
 * Subscribe to user notification logs
 */
export function subscribeToNotificationLogs(
  userId: string,
  onUpdate: (logs: NotificationLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const path = `users/${userId}/notificationLogs`;
  const colRef = collection(db, 'users', userId, 'notificationLogs');
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const logs: NotificationLog[] = [];
      snap.forEach((d) => logs.push(d.data() as NotificationLog));
      onUpdate(logs.slice(0, 20)); // Limit to last 20 logs
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      onUpdate([]);
      if (onError) {
        onError(err);
      }
    }
  );
}

/**
 * Trigger Server-Side Webhook Dispatch API
 */
export async function dispatchExternalNotification(
  payload: NotificationPayloadDirective
): Promise<NotificationDispatchResult> {
  const res = await fetch('/api/notifications/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to dispatch notification to ${payload.provider}`);
  }

  return {
    provider: payload.provider,
    success: true,
    statusText: data.statusText,
    timestamp: Date.now(),
  };
}

/**
 * Test External Notification Webhook Connectivity API
 */
export async function testExternalNotification(
  provider: 'slack' | 'discord' | 'email',
  webhookUrl: string,
  emailAddress?: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      webhookUrl,
      emailAddress,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Test failed for ${provider}`);
  }

  return data;
}

