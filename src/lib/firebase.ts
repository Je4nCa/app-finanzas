import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseApp     = initializeApp(firebaseConfig)
export const firestore       = getFirestore(firebaseApp)
export const auth            = getAuth(firebaseApp)
export const googleProvider  = new GoogleAuthProvider()

const HOUSEHOLD_ID =
  localStorage.getItem('mamocitos_household') ??
  import.meta.env.VITE_HOUSEHOLD_ID ??
  'local'

export const hCol = (name: string) =>
  collection(firestore, 'households', HOUSEHOLD_ID, name)

export const hDoc = (colName: string, id: string) =>
  doc(firestore, 'households', HOUSEHOLD_ID, colName, id)
