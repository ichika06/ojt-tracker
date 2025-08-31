"use client"

import React, { useMemo, useState } from "react"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { StaticTimePicker } from "@mui/x-date-pickers/StaticTimePicker"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"

import "../styles/globals.css"
import "../styles/ios-time-picker.css"
// Static Time Picker (MUI) with the same API.
// Props:
// - value: string | null -> "h:mm AM/PM" (e.g., "2:05 PM")
// - onChange: (value: string) => void
// - label?: string
const IOSTimePicker = ({ value, onChange, label = "Time", hideActions = false }) => {
  // No separate modal; TimePicker handles its own popper

  // Parse incoming 12h time string to Date
  const initialDate = useMemo(() => {
    if (!value || typeof value !== "string") return new Date()
    const m = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!m) return new Date()
    let h = parseInt(m[1], 10)
    const minute = parseInt(m[2], 10)
    const period = m[3].toUpperCase()
    if (period === "AM") {
      if (h === 12) h = 0
    } else {
      if (h !== 12) h += 12
    }
    const d = new Date()
    d.setHours(h, minute, 0, 0)
    return d
  }, [value])

  const [tempDate, setTempDate] = useState(initialDate)

  // Keep tempDate in sync when value changes externally
  React.useEffect(() => {
    setTempDate(initialDate)
  }, [initialDate])

  const format12h = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return null
    let h = date.getHours()
    const m = date.getMinutes()
    const period = h >= 12 ? "PM" : "AM"
    h = h % 12
    if (h === 0) h = 12
    const mm = String(m).padStart(2, "0")
    return `${h}:${mm} ${period}`
  }

  const handleChange = (newVal) => {
    if (!newVal) return
    setTempDate(newVal)
    // Immediately update parent with new time value
    const next = format12h(newVal)
    if (next && onChange) onChange(next)
  }

  const handleCancel = () => {
    setTempDate(initialDate)
  }

  const handleDone = () => {
    const next = format12h(tempDate)
    if (next) onChange && onChange(next)
  }

  return (
    <div className="w-full p-0 sm:p-0 ios-time-picker-mui">
      <label className="mb-1 block text-sm sm:text-base text-muted-foreground">{label}</label>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div>
          <div className=" rounded-xl shadow-md transition-colors duration-200">
            <StaticTimePicker
              ampm
              value={tempDate}
              onChange={handleChange}
              minutesStep={1}
              displayStaticWrapperAs="mobile"
              slotProps={{
                actionBar: { actions: [] },
                toolbar: { sx: { fontSize: { xs: '0.9rem', sm: '1.15rem', md: '1.25rem' } } },
                tabs: { sx: { fontSize: { xs: '0.8rem', sm: '1rem', md: '1.1rem' } } },
                clock: {
                  sx: {
                    fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2rem' },
                    width: { xs: 220, sm: 260, md: 320 },
                    height: { xs: 220, sm: 260, md: 320 },
                    maxWidth: '100%',
                    margin: '0 auto',
                  },
                },
              }}
              sx={{
                width: { xs: '100%', sm: 340, md: 400 },
                maxWidth: '100%',
                minWidth: 0,
                fontSize: { xs: '0.9rem', sm: '1.15rem', md: '1.25rem' },
              }}
            />
          </div>
        </div>
        {!hideActions && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-md border px-4 py-3 text-base sm:text-sm hover:bg-accent active:scale-95 touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              className="flex-1 rounded-md bg-primary px-4 py-3 text-base sm:text-sm text-primary-foreground hover:opacity-90 active:scale-95 touch-manipulation"
            >
              Done
            </button>
          </div>
        )}
      </LocalizationProvider>
    </div>
  )
}

export default IOSTimePicker
 
