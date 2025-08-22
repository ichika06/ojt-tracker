"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, Target, TrendingUp, LogOut, Sun, Moon } from "lucide-react"
import AuthForm from "@/components/auth-form"
import IOSTimePicker from "@/components/ios-time-picker"
import { onAuthStateChange, logOut } from "@/lib/auth"
import { saveTimeLog, saveGoal, subscribeToTimeLogs, subscribeToUserGoal } from "@/lib/firestore"

export default function TimeTracker() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [totalGoal, setTotalGoal] = useState(486)
  const [dailyLogs, setDailyLogs] = useState([])
  const [todayHours, setTodayHours] = useState("")
  const [timeNeededToRender, setTimeNeededToRender] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }))
  const [saving, setSaving] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [useTimeInput, setUseTimeInput] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user && !user.emailVerified) {
        // If user is logged in but email is not verified, sign them out
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
      // Subscribe to time logs
      const unsubscribeLogs = subscribeToTimeLogs(user.uid, (logs) => {
        setDailyLogs(logs)
        // Also cache in localStorage for offline access
        localStorage.setItem(`timeTrackerLogs_${user.uid}`, JSON.stringify(logs))
      })

      // Subscribe to user goal
      const unsubscribeGoal = subscribeToUserGoal(user.uid, (goal) => {
        setTotalGoal(goal)
        // Also cache in localStorage for offline access
        localStorage.setItem(`timeTrackerGoal_${user.uid}`, goal.toString())
      })

      // Load cached data immediately for faster initial load
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
        {/* Snowy effect for light mode only */}
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

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
  const totalHoursLogged = dailyLogs.reduce((sum, log) => sum + log.hours, 0)
  const remainingHours = Math.max(0, totalGoal - totalHoursLogged)
  const progressPercentage = (totalHoursLogged / totalGoal) * 100

  const addSelectedDateHours = async () => {
    const hours = Number.parseFloat(todayHours)
    const neededHours = Number.parseFloat(timeNeededToRender)
    if (isNaN(hours) || hours <= 0) return

    setSaving(true)

    // Prepare log data
    // Only include neededHours if it's a valid number > 0
    const validNeededHours = !isNaN(neededHours) && neededHours > 0 ? neededHours : null
    const overtimeHours = validNeededHours ? Math.max(0, hours - validNeededHours) : 0

    const logData = {
      hours: hours,
      neededHours: validNeededHours,
      timeNeeded: validNeededHours, // Add timeNeeded field for database
      overtime: overtimeHours // Add overtime field for database
    }

    // Save to Firestore (will trigger real-time update)
    const result = await saveTimeLog(user.uid, selectedDate, hours, logData)

    if (result.success) {
      setTodayHours("")
      setTimeNeededToRender("")
      console.log("[v0] Successfully saved time log to Firestore")
    } else {
      console.error("[v0] Failed to save time log:", result.error)
      // Fallback to local storage if Firestore fails
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
    
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    
    let startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin
    
    // Handle overnight shifts (end time is next day)
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60
    }
    
    const diffMinutes = endMinutes - startMinutes
    const hours = diffMinutes / 60
    
    return hours.toFixed(1)
  }

  const handleTimeChange = (type, value) => {
    if (type === 'start') {
      setStartTime(value)
      const calculatedHours = calculateHoursFromTime(value, endTime)
      if (calculatedHours) setTodayHours(calculatedHours)
    } else {
      setEndTime(value)
      const calculatedHours = calculateHoursFromTime(startTime, value)
      if (calculatedHours) setTodayHours(calculatedHours)
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
    // Reset time inputs when switching dates
    setStartTime("")
    setEndTime("")
    setUseTimeInput(false)
  }

  const getCalendarDays = () => {
    // Use Philippines timezone for calendar generation
    const philippinesDate = new Date(currentMonth.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    const year = philippinesDate.getFullYear()
    const month = philippinesDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    const dayOfWeek = firstDay.getDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startDate.setDate(startDate.getDate() - mondayOffset)

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      const dateStr = current.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
      const log = dailyLogs.find((l) => l.date === dateStr)
      const isCurrentMonth = current.getMonth() === month
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
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  const selectedDateLog = getSelectedDateLog()
  const calendarDays = getCalendarDays()

  const formatSelectedDate = (dateStr) => {
    const isToday = dateStr === today
    if (isToday) return "Today"
    
    // Simple direct parsing without any calculations
    const [year, month, day] = dateStr.split('-').map(Number)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    // Just display the month and day without weekday
    return `${months[month - 1]} ${day}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-blue-500 to-white dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 p-4 relative">
      {/* Snowy effect for light mode only */}
      {!darkMode && <div className="snow-effect"></div>}
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="text-center sm:text-left space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">Time Tracker</h1>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Welcome back, {user.email.split('@')[0]}</p>
          </div>
          <div className="flex items-center justify-center sm:justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={toggleDarkMode} className="bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95">
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Sign Out</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Total Goal</CardTitle>
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{totalGoal}h</div>
            </CardContent>
          </Card>

          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Hours Logged</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{totalHoursLogged}h</div>
            </CardContent>
          </Card>

          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Remaining</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{remainingHours}h</div>
            </CardContent>
          </Card>

          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Progress</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{Math.round(progressPercentage)}%</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              {totalHoursLogged} of {totalGoal} hours completed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg">
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
                            {log.hours}h
                          </td>
                          <td className="p-2 text-gray-700 dark:text-gray-300">
                            {log.neededHours ? `${log.neededHours}h` : '-'}
                          </td>
                          <td className="p-2">
                            <span className={`font-medium ${hasOvertime ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
                              {hasOvertime ? (() => {
                                const ot = log.hours - log.neededHours
                                return ot % 1 === 0 ? `${ot}h OT` : `${ot.toFixed(1)}h OT`
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
                        return totalOT % 1 === 0 ? `${totalOT}h OT` : `${totalOT.toFixed(1)}h OT`
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
                        return avgOT % 1 === 0 ? `${avgOT}h` : `${avgOT.toFixed(1)}h`
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg">
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
                      // Calculate overtime: hours worked - needed hours (same as preview)
                      const neededHours = log.neededHours || 0
                      const overtime = log.hours - neededHours
                      
                      return (
                        <tr key={index} className="border-b border-white/20 dark:border-white/10 hover:bg-orange-50/40 dark:hover:bg-orange-900/20 transition-colors duration-200">
                          <td className="p-2 text-gray-900 dark:text-white font-medium">
                            {formatSelectedDate(log.date)}
                          </td>
                          <td className="p-2 text-orange-500 font-bold text-lg">
                            {overtime % 1 === 0 ? `${overtime}h OT` : `${overtime.toFixed(1)}h OT`}
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
                        return totalOT % 1 === 0 ? `${totalOT}h OT` : `${totalOT.toFixed(1)}h OT`
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg order-2 xl:order-1">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Log Hours for {formatSelectedDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDateLog && (
                <div className="p-3 bg-blue-100/40 dark:bg-blue-900/30 backdrop-blur-sm rounded-lg border border-blue-200/40 dark:border-blue-800/30 space-y-2">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    {formatSelectedDate(selectedDate)}: {selectedDateLog.hours} hours logged
                  </p>
                  {selectedDateLog.neededHours && selectedDateLog.neededHours > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="text-gray-700 dark:text-gray-300">
                        Required: {selectedDateLog.neededHours}h
                      </p>
                      {selectedDateLog.hours > selectedDateLog.neededHours && (
                        <p className="text-orange-500 font-medium">
                          Overtime: {(() => {
                            const ot = selectedDateLog.hours - selectedDateLog.neededHours
                            return ot % 1 === 0 ? `${ot}h OT` : `${ot.toFixed(1)}h OT`
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Live preview for current inputs */}
              {(todayHours || timeNeededToRender) && (
                <div className="p-3 bg-blue-50/60 dark:bg-blue-900/40 backdrop-blur-sm rounded-lg border border-blue-200/40 dark:border-blue-800/30">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">Preview:</p>
                  <div className="text-xs space-y-1">
                    {todayHours && (
                      <p className="text-gray-700 dark:text-gray-300">
                        Hours to log: {todayHours}h
                      </p>
                    )}
                    {timeNeededToRender && (
                      <p className="text-gray-700 dark:text-gray-300">
                        Required: {timeNeededToRender}h
                      </p>
                    )}
                    {todayHours && timeNeededToRender && Number.parseFloat(todayHours) > Number.parseFloat(timeNeededToRender) && (
                      <p className="text-orange-500 font-medium">
                        Overtime: {(() => {
                          const ot = Number.parseFloat(todayHours) - Number.parseFloat(timeNeededToRender)
                          return ot % 1 === 0 ? `${ot}h OT` : `${ot.toFixed(1)}h OT`
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
                    onClick={() => setUseTimeInput(!useTimeInput)}
                    className="text-xs bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95 self-start sm:self-auto"
                  >
                    {useTimeInput ? "Manual Hours" : "Time Range"}
                  </Button>
                </div>
                
                {useTimeInput ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2">
                      <div className="flex-1 min-w-0">
                        <IOSTimePicker
                          label="Start Time"
                          value={startTime}
                          onChange={(value) => handleTimeChange('start', value)}
                        />
                      </div>

                      <div className="text-gray-900 dark:text-white font-medium px-2 text-center sm:text-left">To</div>

                      <div className="flex-1 min-w-0">
                        <IOSTimePicker
                          label="End Time"
                          value={endTime}
                          onChange={(value) => handleTimeChange('end', value)}
                        />
                      </div>
                    </div>
                    {startTime && endTime && (
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium text-center sm:text-left">
                        Calculated: {todayHours}h
                      </div>
                    )}
                  </div>
                ) : (
                  <Input
                    id="hours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={todayHours}
                    onChange={(e) => setTodayHours(e.target.value)}
                    placeholder="Enter hours (e.g., 8.5)"
                    className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/40 dark:border-white/20 focus:border-blue-400 dark:focus:border-blue-400 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                )}
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

              <Button onClick={addSelectedDateHours} className="w-full bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/40 text-white shadow-lg" disabled={saving}>
                {saving ? "Saving..." : selectedDateLog ? `Update ${formatSelectedDate(selectedDate)}` : "Log Hours"}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="goal" className="text-gray-900 dark:text-white">
                  Total Goal (hours)
                </Label>
                <Input id="goal" type="number" min="1" value={totalGoal} onChange={(e) => updateGoal(e.target.value)} className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/40 dark:border-white/20 focus:border-blue-400 dark:focus:border-blue-400 placeholder:text-gray-500 dark:placeholder:text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-lg order-1 xl:order-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <CardTitle className="text-gray-900 dark:text-white text-center sm:text-left">Calendar View</CardTitle>
                <div className="flex items-center justify-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95">
                    ←
                  </Button>
                  <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} className="bg-white/30 dark:bg-black/30 backdrop-blur-sm border-white/40 dark:border-white/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-800 dark:text-white touch-manipulation active:scale-95">
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
                    className="text-center text-xs sm:text-sm font-semibold text-gray-900 dark:text-white p-1 sm:p-2 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-md border border-white/30 dark:border-white/10"
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
                      aspect-square p-1 text-xs rounded-lg border transition-all duration-200 cursor-pointer relative backdrop-blur-sm touch-manipulation active:scale-95
                      ${day.isCurrentMonth ? "bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30" : "bg-gray-300/30 dark:bg-gray-700/30 cursor-not-allowed"}
                      ${day.isToday ? "ring-2 ring-blue-400 ring-offset-1" : ""}
                      ${day.isSelected ? "bg-purple-200/70 text-purple-900 border-purple-400 shadow-md scale-105" : ""}
                      ${day.hours > 0 && !day.isSelected ? "bg-blue-100/40 dark:bg-blue-900/30 border-blue-300/50 dark:border-blue-700/50" : "border-white/30 dark:border-white/10"}
                    `}
                  >
                    {day.isSelected && (
                      <div className="absolute top-0.5 right-0.5">
                        <svg 
                          className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-purple-600" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </div>
                    )}
                    <div className="h-full flex flex-col items-center justify-center">
                      <span
                        className={`${day.isCurrentMonth ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"} ${day.isSelected ? "font-bold" : ""}`}
                      >
                        {day.date.getDate()}
                      </span>
                      {day.hours > 0 && (
                        <span
                          className={`text-[9px] sm:text-[10px] font-medium ${day.isSelected ? "text-purple-600" : "text-blue-600 dark:text-blue-400"}`}
                        >
                          {day.hours}h
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
    </div>
  )
}
