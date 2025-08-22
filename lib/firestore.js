import { collection, doc, setDoc, getDoc, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "./firebase"

// Save user's time logs to Firestore
export const saveTimeLog = async (userId, date, hours, logData = {}) => {
  try {
    const logRef = doc(db, "users", userId, "timeLogs", date)
    await setDoc(
      logRef,
      {
        date,
        hours,
        neededHours: logData.neededHours || null,
        timeNeeded: logData.timeNeeded || null,
        overtime: logData.overtime || 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )
    return { success: true, error: null }
  } catch (error) {
    console.error("Error saving time log:", error)
    return { success: false, error: error.message }
  }
}

// Save user's goal to Firestore
export const saveGoal = async (userId, goal) => {
  try {
    const userRef = doc(db, "users", userId)
    await setDoc(
      userRef,
      {
        totalGoal: goal,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )
    return { success: true, error: null }
  } catch (error) {
    console.error("Error saving goal:", error)
    return { success: false, error: error.message }
  }
}

// Get user's goal from Firestore
export const getUserGoal = async (userId) => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      return { goal: userSnap.data().totalGoal || 486, error: null }
    } else {
      return { goal: 486, error: null }
    }
  } catch (error) {
    console.error("Error getting user goal:", error)
    return { goal: 486, error: error.message }
  }
}

// Listen to real-time updates for user's time logs
export const subscribeToTimeLogs = (userId, callback) => {
  const timeLogsRef = collection(db, "users", userId, "timeLogs")
  const q = query(timeLogsRef, orderBy("date", "desc"))

  return onSnapshot(
    q,
    (snapshot) => {
      const logs = []
      snapshot.forEach((doc) => {
        logs.push(doc.data())
      })
      callback(logs)
    },
    (error) => {
      console.error("Error listening to time logs:", error)
      callback([])
    },
  )
}

// Listen to real-time updates for user's goal
export const subscribeToUserGoal = (userId, callback) => {
  const userRef = doc(db, "users", userId)

  return onSnapshot(
    userRef,
    (doc) => {
      if (doc.exists()) {
        callback(doc.data().totalGoal || 486)
      } else {
        callback(486)
      }
    },
    (error) => {
      console.error("Error listening to user goal:", error)
      callback(486)
    },
  )
}
