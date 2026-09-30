import { initializeApp } from 'firebase/app'
import { collection, getFirestore, limit, onSnapshot, orderBy, query } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.projectId)

let db = null
function firestore() {
  if (!firebaseConfigured) return null
  if (!db) db = getFirestore(initializeApp(config))
  return db
}

export function subscribeLiveFeed(onData, onError, max = 12) {
  const store = firestore()
  if (!store) return () => {}
  const q = query(collection(store, 'live_feed'), orderBy('submitted_at', 'desc'), limit(max))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err),
  )
}
