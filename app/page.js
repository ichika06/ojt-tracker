"use client"
import { useState, useEffect } from "react"
// Importing necessary components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, Target, TrendingUp, LogOut, Sun, Moon } from "lucide-react"
import AuthForm from "@/components/auth-form"
import IOSTimePicker from "@/components/ios-time-picker"
// Importing authentication and firestore functions
import { onAuthStateChange, logOut } from "@/lib/auth"
import { saveTimeLog, saveGoal, subscribeToTimeLogs, subscribeToUserGoal } from "@/lib/firestore"

export default function TimeTracker() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [totalGoal, setTotalGoal] = useState(486)
  const [dailyLogs, setDailyLogs] = useState([])
  const [todayHours, setTodayHours] = useState("")
  // Always keep todayHours as a string for input value
  const setTodayHoursSafe = (val) => {
    if (val == null || val === undefined) {
      setTodayHours("")
    } else {
      setTodayHours(val.toString())
    }
  }
  const [timeNeededToRender, setTimeNeededToRender] = useState("")
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    const manilaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    return manilaTime
  })
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
  })
  const [saving, setSaving] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [useTimeInput, setUseTimeInput] = useState(false)
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false)

  const getManilaDateString = () => {
    const now = new Date()
    return now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
  }

  const getManilaDate = () => {
    const now = new Date()
    return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user && !user.emailVerified) {
        await logOut()
        setUser(null)
      } else {
        setUser(user)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode")
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  useEffect(() => {
    if (user) {
      const unsubscribeLogs = subscribeToTimeLogs(user.uid, (logs) => {
        setDailyLogs(logs)
        localStorage.setItem(`timeTrackerLogs_${user.uid}`, JSON.stringify(logs))
      })
      const unsubscribeGoal = subscribeToUserGoal(user.uid, (goal) => {
        setTotalGoal(goal)
        localStorage.setItem(`timeTrackerGoal_${user.uid}`, goal.toString())
      })
      const cachedLogs = localStorage.getItem(`timeTrackerLogs_${user.uid}`)
      const cachedGoal = localStorage.getItem(`timeTrackerGoal_${user.uid}`)
      if (cachedLogs) {
        setDailyLogs(JSON.parse(cachedLogs))
      }
      if (cachedGoal) {
        setTotalGoal(Number.parseInt(cachedGoal))
      }
      return () => {
        unsubscribeLogs()
        unsubscribeGoal()
      }
    }
  }, [user])

  const handleSignOut = async () => {
    await logOut()
    setDailyLogs([])
    setTotalGoal(486)
    setTodayHours("")
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center relative">
        {!darkMode && <div className="snow-effect"></div>}
        <div className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-2xl p-8 shadow-lg relative z-10">
          <div className="text-gray-900 dark:text-white text-lg font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onAuthSuccess={setUser} />
  }

  const today = getManilaDateString()
  const totalHoursLogged = dailyLogs.reduce((sum, log) => sum + log.hours, 0)
  const remainingHours = Math.max(0, totalGoal - totalHoursLogged)
  const progressPercentage = (totalHoursLogged / totalGoal) * 100

  const addSelectedDateHours = async () => {
    const hours = Number.parseFloat(todayHours)
    const neededHours = Number.parseFloat(timeNeededToRender)
    if (isNaN(hours) || hours <= 0) return
    setSaving(true)
    const validNeededHours = !isNaN(neededHours) && neededHours > 0 ? neededHours : null
    const overtimeHours = validNeededHours ? Math.max(0, hours - validNeededHours) : 0
    const logData = {
      hours: hours,
      neededHours: validNeededHours,
      timeNeeded: validNeededHours,
      overtime: overtimeHours
    }
    const result = await saveTimeLog(user.uid, selectedDate, hours, logData)
    if (result.success) {
      setTodayHours("")
      setTimeNeededToRender("")
      console.log("[v0] Successfully saved time log to Firestore")
    } else {
      console.error("[v0] Failed to save time log:", result.error)
      const existingLogIndex = dailyLogs.findIndex((log) => log.date === selectedDate)
      if (existingLogIndex >= 0) {
        const updatedLogs = [...dailyLogs]
        updatedLogs[existingLogIndex] = { ...updatedLogs[existingLogIndex], ...logData, date: selectedDate }
        setDailyLogs(updatedLogs)
      } else {
        setDailyLogs([...dailyLogs, { date: selectedDate, ...logData }])
      }
      setTodayHours("")
      setTimeNeededToRender("")
    }
    setSaving(false)
  }

  const updateGoal = async (newGoal) => {
    const goalValue = Number.parseInt(newGoal) || 486
    setTotalGoal(goalValue)
    if (user) {
      await saveGoal(user.uid, goalValue)
      console.log("[v0] Successfully saved goal to Firestore")
    }
  }

  const calculateHoursFromTime = (start, end) => {
    if (!start || !end) return ""

    const toMinutes = (str) => {
      if (!str || typeof str !== "string") return null
      const s = str.trim()
      // 12-hour format: h:mm AM/PM
      const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
      if (m12) {
        let h = parseInt(m12[1], 10)
        const min = parseInt(m12[2], 10)
        const period = m12[3].toUpperCase()
        if (period === "AM") {
          if (h === 12) h = 0
        } else {
          if (h !== 12) h += 12
        }
        return h * 60 + min
      }
      // 24-hour format: HH:mm
      const m24 = s.match(/^(\d{1,2}):(\d{2})$/)
      if (m24) {
        const h = Math.max(0, Math.min(23, parseInt(m24[1], 10)))
        const min = Math.max(0, Math.min(59, parseInt(m24[2], 10)))
        return h * 60 + min
      }
      return null
    }

    const startMinutes = toMinutes(start)
    const endMinutesRaw = toMinutes(end)
    if (startMinutes == null || endMinutesRaw == null) return ""
    let endMinutes = endMinutesRaw
    // Allow crossing midnight
    if (endMinutes < startMinutes) endMinutes += 24 * 60
    const diffMinutes = endMinutes - startMinutes
    const hours = diffMinutes / 60
    // keep two decimals in state; UI will format to h m
    return Math.max(0, hours).toFixed(2)
  }

  // Format a hours number/string into "Xh Ym" (e.g., 1.2 -> 1h 12m)
  const formatHM = (hoursVal) => {
    if (hoursVal == null || hoursVal === "") return "0h"
    const n = typeof hoursVal === "number" ? hoursVal : Number.parseFloat(hoursVal)
    if (!isFinite(n) || n <= 0) return "0h"
    const totalMinutes = Math.round(n * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (m === 0) return `${h}h`
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
  }

  const handleTimeChange = (type, value) => {
    if (type === 'start') {
      setStartTime(value)
      const calculatedHours = calculateHoursFromTime(value, endTime)
  setTodayHoursSafe(calculatedHours)
    } else {
      setEndTime(value)
      const calculatedHours = calculateHoursFromTime(startTime, value)
  setTodayHoursSafe(calculatedHours)
    }
  }

  const getSelectedDateLog = () => {
    return dailyLogs.find((log) => log.date === selectedDate)
  }

  const handleDateClick = (dateStr, isCurrentMonth) => {
    if (!isCurrentMonth) return
    setSelectedDate(dateStr)
    const existingLog = dailyLogs.find((log) => log.date === dateStr)
    setTodayHours(existingLog ? existingLog.hours.toString() : "")
    setTimeNeededToRender(existingLog && existingLog.neededHours ? existingLog.neededHours.toString() : "")
    setStartTime("")
    setEndTime("")
  }

  const getCalendarDays = () => {
    const manilaMonth = new Date(currentMonth.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    const year = manilaMonth.getFullYear()
    const month = manilaMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    const dayOfWeek = firstDay.getDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startDate.setDate(startDate.getDate() - mondayOffset)
    const days = []
    const current = new Date(startDate)
    for (let i = 0; i < 42; i++) {
      const year = current.getFullYear()
      const month = current.getMonth() + 1
      const day = current.getDate()
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      const log = dailyLogs.find((l) => l.date === dateStr)
      const isCurrentMonth = current.getMonth() === manilaMonth.getMonth()
      const isToday = dateStr === today
      const isSelected = dateStr === selectedDate
      days.push({
        date: new Date(current),
        dateStr,
        hours: log?.hours || 0,
        isCurrentMonth,
        isToday,
        isSelected,
      })
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const manilaDate = new Date(prev.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
      manilaDate.setMonth(manilaDate.getMonth() + (direction === "next" ? 1 : -1))
      return manilaDate
    })
  }

  const selectedDateLog = getSelectedDateLog()
  const calendarDays = getCalendarDays()

  const formatSelectedDate = (dateStr) => {
    const isToday = dateStr === today
    if (isToday) return "Today"
    const [year, month, day] = dateStr.split('-').map(Number)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${months[month - 1]} ${day}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-blue-500 to-white dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 p-4 relative z-base">
      {!darkMode && <div className="snow-effect"></div>}
      <div className="max-w-6xl mx-auto space-y-6 relative z-above">
        {/* Header and Stats Cards */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl relative z-above">
          <div className="text-center sm:text-left space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">Time Tracker</h1>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Welcome back, {user.email.split('@')[0]}</p>
          </div>
          <div className="flex items-center justify-center sm:justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={toggleDarkMode} className="bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95 relative z-above">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95 relative z-above">
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 relative z-above">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Total Goal</CardTitle>
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{formatHM(totalGoal)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 relative z-above">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Hours Logged</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatHM(totalHoursLogged)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 relative z-above">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Remaining</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{formatHM(remainingHours)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 relative z-above">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Progress</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{Math.round(progressPercentage)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg relative z-above">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              {formatHM(totalHoursLogged)} of {formatHM(totalGoal)} completed
            </p>
          </CardContent>
        </Card>

        {/* Time Tracking Overview Table */}
        <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg relative z-above">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Time Tracking Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/30 dark:border-white/20">
                    <th className="text-left p-2 text-gray-900 dark:text-white font-medium">Date</th>
                    <th className="text-left p-2 text-gray-900 dark:text-white font-medium">Hours Worked</th>
                    <th className="text-left p-2 text-gray-900 dark:text-white font-medium">Time Needed</th>
                    <th className="text-left p-2 text-gray-900 dark:text-white font-medium">Overtime</th>
                    <th className="text-left p-2 text-gray-900 dark:text-white font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyLogs
                    .filter(log => log.hours > 0)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 10)
                    .map((log, index) => {
                      const neededHours = log.neededHours
                      const hasOvertime = neededHours && neededHours > 0 && log.hours > neededHours
                      return (
                        <tr key={index} className="border-b border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-colors duration-200">
                          <td className="p-2 text-gray-900 dark:text-white">
                            {formatSelectedDate(log.date)}
                          </td>
                          <td className="p-2 text-gray-900 dark:text-white font-medium">
                            {formatHM(log.hours)}
                          </td>
                          <td className="p-2 text-gray-700 dark:text-gray-300">
                            {log.neededHours ? formatHM(log.neededHours) : '-'}
                          </td>
                          <td className="p-2">
                            <span className={`font-medium ${hasOvertime ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
                              {hasOvertime ? (() => {
                                const ot = log.hours - log.neededHours
                                return `${formatHM(ot)} OT`
                              })() : (log.neededHours ? '0h OT' : '-')}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
                              hasOvertime
                                ? 'bg-orange-100/60 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-green-100/60 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {hasOvertime ? 'Overtime' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  {dailyLogs.filter(log => log.hours > 0).length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No time logs yet. Start logging your hours!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {dailyLogs.filter(log => log.hours > 0).length > 0 && (
              <div className="mt-4 p-3 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-lg border border-white/30 dark:border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">Total Overtime: </span>
                    <span className="font-medium text-orange-500">
                      {(() => {
                        const totalOT = dailyLogs.reduce((total, log) => {
                          const neededHours = log.neededHours
                          if (!neededHours || neededHours <= 0) return total
                          const overtime = log.hours - neededHours
                          return total + Math.max(0, overtime)
                        }, 0)
                        return `${formatHM(totalOT)} OT`
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">Days with OT: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dailyLogs.filter(log => {
                        const neededHours = log.neededHours
                        if (!neededHours || neededHours <= 0) return false
                        const overtime = log.hours - neededHours
                        return overtime > 0
                      }).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">Avg OT/Day: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(() => {
                        const workingDays = dailyLogs.filter(log => log.hours > 0).length
                        if (workingDays === 0) return '0h'
                        const totalOT = dailyLogs.reduce((total, log) => {
                          const neededHours = log.neededHours
                          if (!neededHours || neededHours <= 0) return total
                          const overtime = log.hours - neededHours
                          return total + Math.max(0, overtime)
                        }, 0)
                        const avgOT = totalOT / workingDays
                        return formatHM(avgOT)
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overtime Hours Summary Table */}
        <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg relative z-above">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Overtime Hours Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/30 dark:border-white/20">
                    <th className="text-left p-2 text-gray-900 dark:text-white font-medium">Date</th>
                    <th className="text-left p-2 text-gray-900 dark:text-white font-medium">Overtime Hours</th>
                    <th className="text-left p-2 text-gray-900 dark:text-white font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyLogs
                    .filter(log => {
                      const neededHours = log.neededHours
                      if (!neededHours || neededHours <= 0) return false
                      const overtime = log.hours - neededHours
                      return overtime > 0
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((log, index) => {
                      const neededHours = log.neededHours || 0
                      const overtime = log.hours - neededHours
                      return (
                        <tr key={index} className="border-b border-white/20 dark:border-white/10 hover:bg-orange-50/40 dark:hover:bg-orange-900/20 transition-colors duration-200">
                          <td className="p-2 text-gray-900 dark:text-white font-medium">
                            {formatSelectedDate(log.date)}
                          </td>
                          <td className="p-2 text-orange-500 font-bold text-lg">
                            {`${formatHM(overtime)} OT`}
                          </td>
                          <td className="p-2">
                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-orange-100/60 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 backdrop-blur-sm">
                              Overtime
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  {dailyLogs.filter(log => {
                    const neededHours = log.neededHours
                    if (!neededHours || neededHours <= 0) return false
                    const overtime = Math.max(0, log.hours - neededHours)
                    return overtime > 0
                  }).length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No overtime hours logged yet. Work beyond required hours to see overtime!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {dailyLogs.filter(log => {
              const neededHours = log.neededHours
              if (!neededHours || neededHours <= 0) return false
              const overtime = Math.max(0, log.hours - neededHours)
              return overtime > 0
            }).length > 0 && (
              <div className="mt-4 p-3 bg-orange-50/40 dark:bg-orange-900/30 backdrop-blur-sm rounded-lg border border-orange-200/40 dark:border-orange-800/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">Total OT Days: </span>
                    <span className="font-bold text-orange-500">
                      {dailyLogs.filter(log => {
                        const neededHours = log.neededHours
                        if (!neededHours || neededHours <= 0) return false
                        const overtime = Math.max(0, log.hours - neededHours)
                        return overtime > 0
                      }).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">Total OT Hours: </span>
                    <span className="font-bold text-orange-500">
                      {(() => {
                        const totalOT = dailyLogs.reduce((total, log) => {
                          const neededHours = log.neededHours
                          if (!neededHours || neededHours <= 0) return total
                          const overtime = Math.max(0, log.hours - neededHours)
                          return total + overtime
                        }, 0)
                        return `${formatHM(totalOT)} OT`
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Log Hours Card */}
          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg order-2 xl:order-1 relative z-above">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Log Hours for {formatSelectedDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDateLog && (
                <div className="p-3 bg-blue-100/40 dark:bg-blue-900/30 backdrop-blur-sm rounded-lg border border-blue-200/40 dark:border-blue-800/30 space-y-2">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    {formatSelectedDate(selectedDate)}: {formatHM(selectedDateLog.hours)} logged
                  </p>
                  {selectedDateLog.neededHours && selectedDateLog.neededHours > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="text-gray-700 dark:text-gray-300">
                        Required: {formatHM(selectedDateLog.neededHours)}
                      </p>
                      {selectedDateLog.hours > selectedDateLog.neededHours && (
                        <p className="text-orange-500 font-medium">
                          Overtime: {(() => {
                            const ot = selectedDateLog.hours - selectedDateLog.neededHours
                            return `${formatHM(ot)} OT`
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {(todayHours || timeNeededToRender) && (
                <div className="p-3 bg-blue-50/60 dark:bg-blue-900/40 backdrop-blur-sm rounded-lg border border-blue-200/40 dark:border-blue-800/30">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">Preview:</p>
                  <div className="text-xs space-y-1">
                    {todayHours && (
                      <p className="text-gray-700 dark:text-gray-300">
                        Hours to log: {formatHM(todayHours)}
                      </p>
                    )}
                    {timeNeededToRender && (
                      <p className="text-gray-700 dark:text-gray-300">
                        Required: {formatHM(timeNeededToRender)}
                      </p>
                    )}
                    {todayHours && timeNeededToRender && Number.parseFloat(todayHours) > Number.parseFloat(timeNeededToRender) && (
                      <p className="text-orange-500 font-medium">
                        Overtime: {(() => {
                          const ot = Number.parseFloat(todayHours) - Number.parseFloat(timeNeededToRender)
                          return `${formatHM(ot)} OT`
                        })()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label htmlFor="hours" className="text-gray-900 dark:text-white">
                    Hours worked on {formatSelectedDate(selectedDate)}
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTimeModalOpen(true)}
                    className="text-xs bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95 self-start sm:self-auto"
                  >
                    Time Range
                  </Button>
                </div>

                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={todayHours ?? ""}
                  onChange={(e) => setTodayHoursSafe(e.target.value)}
                  placeholder="Enter hours (e.g., 8.5)"
                  className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/40 dark:border-white/20 focus:border-blue-400 dark:focus:border-blue-400 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neededHours" className="text-gray-900 dark:text-white">
                  Time needed to render (hours)
                </Label>
                <Input
                  id="neededHours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={timeNeededToRender}
                  onChange={(e) => setTimeNeededToRender(e.target.value)}
                  placeholder="Enter required hours (e.g., 8.0)"
                  className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/40 dark:border-white/20 focus:border-blue-400 dark:focus:border-blue-400 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Hours beyond this will count as overtime
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={addSelectedDateHours} className="flex-1 bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/40 text-white shadow-lg" disabled={saving}>
                  {saving ? "Saving..." : selectedDateLog ? `Update ${formatSelectedDate(selectedDate)}` : "Log Hours"}
                </Button>
                {selectedDateLog && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-white/30 dark:bg-black/30 border border-white/40 dark:border-white/20 text-gray-800 dark:text-white hover:bg-white/40 dark:hover:bg-black/40"
                    onClick={async () => {
                      if (!user) return
                      setSaving(true)
                      try {
                        // Remove from Firestore
                        const { doc, deleteDoc } = await import("firebase/firestore")
                        const logRef = doc(require("@/lib/firebase").db, "users", user.uid, "timeLogs", selectedDate)
                        await deleteDoc(logRef)
                        // Remove from local state
                        setDailyLogs(dailyLogs.filter(log => log.date !== selectedDate))
                        setTodayHours("")
                        setTimeNeededToRender("")
                      } catch (err) {
                        console.error("Failed to clear log:", err)
                      }
                      setSaving(false)
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal" className="text-gray-900 dark:text-white">
                  Total Goal (hours)
                </Label>
                <Input id="goal" type="number" min="1" value={totalGoal} onChange={(e) => updateGoal(e.target.value)} className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/40 dark:border-white/20 focus:border-blue-400 dark:focus:border-blue-400 placeholder:text-gray-500 dark:placeholder:text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Calendar Card */}
          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg order-1 xl:order-2 relative z-above">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <CardTitle className="text-gray-900 dark:text-white text-center sm:text-left">Calendar View</CardTitle>
                <div className="flex items-center justify-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95 relative z-above">
                    ←
                  </Button>
                  <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} className="bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95 relative z-above">
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs sm:text-sm font-semibold text-gray-900 dark:text-white p-1 sm:p-2 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-md border border-white/30 dark:border-white/10 relative z-above"
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 1)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day.dateStr, day.isCurrentMonth)}
                    className={`
                      aspect-square p-1 text-xs rounded-lg border transition-all duration-200 cursor-pointer relative backdrop-blur-sm touch-manipulation active:scale-95 z-above hover:z-modal
                      ${day.isCurrentMonth ? "bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30" : "bg-gray-300/30 dark:bg-gray-700/30 cursor-not-allowed"}
                      ${day.isToday ? "ring-2 ring-blue-400 ring-offset-1" : ""}
                      ${day.isSelected ? "bg-purple-200/70 text-purple-900 border-purple-400 shadow-md scale-105 z-modal" : ""}
                      ${day.hours > 0 && !day.isSelected ? "bg-blue-100/40 dark:bg-blue-900/30 border-blue-300/50 dark:border-blue-700/50" : "border-white/30 dark:border-white/10"}
                    `}
                  >
                    {day.isSelected && (
                      <div className="absolute top-0.5 right-0.5 z-above">
                        <svg
                          className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-purple-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </div>
                    )}
                    <div className="h-full flex flex-col items-center justify-center relative z-above">
                      <span
                        className={`${day.isCurrentMonth ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"} ${day.isSelected ? "font-bold" : ""}`}
                      >
                        {day.date.getDate()}
                      </span>
                      {day.hours > 0 && (
                        <span
                          className={`text-[9px] sm:text-[10px] font-medium ${day.isSelected ? "text-purple-600" : "text-blue-600 dark:text-blue-400"}`}
                        >
                          {formatHM(day.hours)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center">
                Tap any date to log or update hours for that day
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Time Selection Modal */}
      {isTimeModalOpen && (
        <div className="fixed inset-0 z-modal bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-6 pb-4 border-b border-white/20 dark:border-white/10 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select Time Range</h3>
              {startTime && endTime && (
                  <span className="font-bold">Calculated: {formatHM(todayHours)}</span>
                )}
              <button
                onClick={() => setIsTimeModalOpen(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <div className="space-y-4">
                <div className="flex flex-col space-y-4">
                  <div className="flex-1 min-w-0 flex justify-center">
                    <div>
                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wider flex items-center justify-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Start Time
                      </div>
                      <div className="bg-white/80 dark:bg-black/80 rounded-xl shadow-md transition-colors duration-200">
                        <IOSTimePicker
                          label="Start Time"
                          value={startTime}
                          hideActions
                          onChange={(value) => handleTimeChange('start', value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center py-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>TO</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-center">
                      <div>
                        <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-wider flex items-center justify-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          End Time
                        </div>
                        <IOSTimePicker
                          label="End Time"
                          value={endTime}
                          hideActions
                          onChange={(value) => handleTimeChange('end', value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Modal actions */}
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimeModalOpen(false)}
                    className="flex-1 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const calculated = calculateHoursFromTime(startTime, endTime)
                      setTodayHoursSafe(calculated)
                      setIsTimeModalOpen(false)
                    }}
                    className="flex-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
