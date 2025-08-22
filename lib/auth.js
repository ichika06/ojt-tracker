import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"

export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return { user: userCredential.user, error: null }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { user: userCredential.user, error: null }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

export const logOut = async () => {
  try {
    await signOut(auth)
    return { error: null }
  } catch (error) {
    return { error: error.message }
  }
}

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}
