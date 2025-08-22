import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from "firebase/auth"
import { auth } from "./firebase"

export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // Send email verification
    await sendEmailVerification(userCredential.user)
    
    // Sign out the user immediately after signup so they can't access the app without verification
    await signOut(auth)
    
    return { 
      user: userCredential.user, 
      error: null,
      message: "Account created successfully! Please check your email and click the verification link before signing in."
    }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    
    // Check if email is verified
    if (!userCredential.user.emailVerified) {
      // Sign out the user if email is not verified
      await signOut(auth)
      return { 
        user: null, 
        error: "Please verify your email before signing in. Check your inbox for a verification link."
      }
    }
    
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

export const resendVerificationEmail = async (user) => {
  try {
    await sendEmailVerification(user)
    return { 
      success: true, 
      error: null,
      message: "Verification email sent! Please check your inbox."
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}
