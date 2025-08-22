"use client"

import { useState, useRef, useEffect } from "react"

const IOSTimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(12)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState("AM")

  const hourRef = useRef(null)
  const minuteRef = useRef(null)
  const periodRef = useRef(null)

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const periods = ["AM", "PM"]

  useEffect(() => {
    if (value) {
      const [time] = value.split(' ')
      const [hour, minute] = time.split(':').map(Number)
      
      if (hour === 0) {
        setSelectedHour(12)
        setSelectedPeriod("AM")
      } else if (hour <= 12) {
        setSelectedHour(hour)
        setSelectedPeriod("AM")
      } else {
        setSelectedHour(hour - 12)
        setSelectedPeriod("PM")
      }
      setSelectedMinute(minute)
    }
  }, [value])

  const formatTime = (hour, minute, period) => {
    let hour24 = hour
    if (period === "AM" && hour === 12) hour24 = 0
    if (period === "PM" && hour !== 12) hour24 = hour + 12
    if (period === "AM" && hour !== 12) hour24 = hour
    if (period === "PM" && hour === 12) hour24 = 12
    
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const handleConfirm = () => {
    const timeString = formatTime(selectedHour, selectedMinute, selectedPeriod)
    onChange(timeString)
    setIsOpen(false)
  }

  const scrollToItem = (ref, index, itemHeight) => {
    if (ref.current) {
      const height = itemHeight || (window.innerWidth < 640 ? 32 : 40)
      ref.current.scrollTop = index * height
    }
  }

  const handleScroll = (ref, setter, items) => {
    if (ref.current) {
      const scrollTop = ref.current.scrollTop
      const itemHeight = window.innerWidth < 640 ? 32 : 40
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index))
      setter(items[clampedIndex])
    }
  }

  const displayValue = value ? (() => {
    const [hour, minute] = value.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
  })() : "Select time"

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-white/40 dark:border-white/20 rounded-lg text-left text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900 dark:text-white hover:bg-white/60 dark:hover:bg-black/60 transition-all duration-200"
      >
        {displayValue}
      </button>

      {isOpen && (
        <>
          {/* Mobile/Touch Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-lg shadow-xl lg:static lg:shadow-2xl">
            <div className="p-3 sm:p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-3 text-center">
                {label}
              </div>
              
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                {/* Hours */}
                <div className="relative flex-1 max-w-[60px] sm:max-w-[64px]">
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center mb-1">Hour</div>
                  <div 
                    ref={hourRef}
                    className="w-full h-28 sm:h-32 overflow-y-auto scrollbar-hide bg-white/30 dark:bg-black/30 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 touch-pan-y"
                    style={{ scrollSnapType: 'y mandatory' }}
                    onScroll={() => handleScroll(hourRef, setSelectedHour, hours)}
                  >
                    <div className="py-10 sm:py-12">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className={`h-8 sm:h-10 flex items-center justify-center text-sm cursor-pointer transition-colors touch-manipulation ${
                            selectedHour === hour 
                              ? 'bg-blue-500/80 text-white rounded backdrop-blur-sm font-medium' 
                              : 'text-gray-900 dark:text-white hover:bg-white/30 dark:hover:bg-white/10'
                          }`}
                          style={{ scrollSnapAlign: 'center' }}
                          onClick={() => {
                            setSelectedHour(hour)
                            scrollToItem(hourRef, hours.indexOf(hour), window.innerWidth < 640 ? 32 : 40)
                          }}
                        >
                          {hour}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-lg font-bold text-gray-900 dark:text-white px-1">:</div>

                {/* Minutes */}
                <div className="relative flex-1 max-w-[60px] sm:max-w-[64px]">
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center mb-1">Min</div>
                  <div 
                    ref={minuteRef}
                    className="w-full h-28 sm:h-32 overflow-y-auto scrollbar-hide bg-white/30 dark:bg-black/30 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 touch-pan-y"
                    style={{ scrollSnapType: 'y mandatory' }}
                    onScroll={() => handleScroll(minuteRef, setSelectedMinute, minutes)}
                  >
                    <div className="py-10 sm:py-12">
                      {minutes.map((minute) => (
                        <div
                          key={minute}
                          className={`h-8 sm:h-10 flex items-center justify-center text-sm cursor-pointer transition-colors touch-manipulation ${
                            selectedMinute === minute 
                              ? 'bg-blue-500/80 text-white rounded backdrop-blur-sm font-medium' 
                              : 'text-gray-900 dark:text-white hover:bg-white/30 dark:hover:bg-white/10'
                          }`}
                          style={{ scrollSnapAlign: 'center' }}
                          onClick={() => {
                            setSelectedMinute(minute)
                            scrollToItem(minuteRef, minutes.indexOf(minute), window.innerWidth < 640 ? 32 : 40)
                          }}
                        >
                          {minute.toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AM/PM */}
                <div className="relative flex-1 max-w-[60px] sm:max-w-[64px]">
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center mb-1">Period</div>
                  <div 
                    ref={periodRef}
                    className="w-full h-28 sm:h-32 overflow-y-auto scrollbar-hide bg-white/30 dark:bg-black/30 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 touch-pan-y"
                    style={{ scrollSnapType: 'y mandatory' }}
                    onScroll={() => handleScroll(periodRef, setSelectedPeriod, periods)}
                  >
                    <div className="py-10 sm:py-12">
                      {periods.map((period) => (
                        <div
                          key={period}
                          className={`h-8 sm:h-10 flex items-center justify-center text-sm cursor-pointer transition-colors touch-manipulation ${
                            selectedPeriod === period 
                              ? 'bg-blue-500/80 text-white rounded backdrop-blur-sm font-medium' 
                              : 'text-gray-900 dark:text-white hover:bg-white/30 dark:hover:bg-white/10'
                          }`}
                          style={{ scrollSnapAlign: 'center' }}
                          onClick={() => {
                            setSelectedPeriod(period)
                            scrollToItem(periodRef, periods.indexOf(period), window.innerWidth < 640 ? 32 : 40)
                          }}
                        >
                          {period}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 mt-3 sm:mt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-3 py-2 text-sm bg-white/30 dark:bg-black/30 backdrop-blur-sm border border-white/40 dark:border-white/20 rounded-lg hover:bg-white/40 dark:hover:bg-black/40 transition-colors text-gray-900 dark:text-white touch-manipulation active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 px-3 py-2 text-sm bg-blue-500/80 text-white rounded-lg hover:bg-blue-600/80 transition-colors backdrop-blur-sm touch-manipulation active:scale-95"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default IOSTimePicker
