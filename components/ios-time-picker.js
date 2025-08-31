"use client"

import React, { useMemo, useState } from "react"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { StaticTimePicker } from "@mui/x-date-pickers/StaticTimePicker"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"

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
  }

  const handleCancel = () => {
    setTempDate(initialDate)
  }

  const handleDone = () => {
    const next = format12h(tempDate)
    if (next) onChange && onChange(next)
  }

  return (
  <div className="w-full">
      <label className="mb-1 block text-sm text-muted-foreground">{label}</label>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div className="rounded-xl border bg-background p-2">
          <StaticTimePicker
            ampm
            value={tempDate}
            onChange={handleChange}
            minutesStep={1}
            displayStaticWrapperAs="mobile"
            slotProps={{ actionBar: { actions: [] } }}
          />
          {!hideActions && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </LocalizationProvider>
    </div>
  )
}

export default IOSTimePicker
 
