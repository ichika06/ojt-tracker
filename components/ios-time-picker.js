"use client"

import { useState, useRef, useEffect, useCallback } from "react"

const IOSTimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(12)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState("AM")

  const hourRef = useRef(null)
  const minuteRef = useRef(null)
  const periodRef = useRef(null)
  const scrollTimeoutRef = useRef(null)

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const periods = ["AM", "PM"]

  useEffect(() => {
    if (value) {
      const [time] = value.split(' ')
      const [hour, minute] = time.split(':').map(Number)
      
      if (hour === 0) {
        // 00:xx is 12:xx AM
        setSelectedHour(12)
        setSelectedPeriod("AM")
      } else if (hour < 12) {
        // 01:xx - 11:xx is AM
        setSelectedHour(hour)
        setSelectedPeriod("AM")
      } else if (hour === 12) {
        // 12:xx is 12:xx PM
        setSelectedHour(12)
        setSelectedPeriod("PM")
      } else {
        // 13:xx - 23:xx is 01:xx - 11:xx PM
        setSelectedHour(hour - 12)
        setSelectedPeriod("PM")
      }
      setSelectedMinute(minute)
    }
  }, [value])

  // Scroll to selected values when picker opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourRef.current) {
          const hourIndex = hours.indexOf(selectedHour)
          if (hourIndex >= 0) {
            scrollToItem(hourRef, hourIndex)
          }
        }
        if (minuteRef.current) {
          const minuteIndex = minutes.indexOf(selectedMinute)
          if (minuteIndex >= 0) {
            scrollToItem(minuteRef, minuteIndex)
          }
        }
        if (periodRef.current) {
          const periodIndex = periods.indexOf(selectedPeriod)
          if (periodIndex >= 0) {
            scrollToItem(periodRef, periodIndex)
          }
        }
      }, 100) // Small delay to ensure DOM is rendered
    }
  }, [isOpen, selectedHour, selectedMinute, selectedPeriod])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const formatTime = (hour, minute, period) => {
    let hour24 = hour
    if (period === "AM" && hour === 12) {
      // 12:xx AM becomes 00:xx (midnight)
      hour24 = 0
    } else if (period === "AM" && hour !== 12) {
      // 1:xx - 11:xx AM stays the same
      hour24 = hour
    } else if (period === "PM" && hour === 12) {
      // 12:xx PM stays 12:xx (noon)
      hour24 = 12
    } else if (period === "PM" && hour !== 12) {
      // 1:xx - 11:xx PM becomes 13:xx - 23:xx
      hour24 = hour + 12
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const handleConfirm = () => {
    const timeString = formatTime(selectedHour, selectedMinute, selectedPeriod)
    onChange(timeString)
    setIsOpen(false)
  }

  const scrollToItem = (ref, index) => {
    if (ref.current) {
      const itemHeight = window.innerWidth < 640 ? 28 : window.innerWidth < 1024 ? 32 : 40
      const containerHeight = ref.current.clientHeight
      const paddingTop = (containerHeight - itemHeight) / 2
      
      // Calculate the scroll position to center the selected item
      const scrollPosition = (index * itemHeight) - paddingTop
      
      ref.current.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      })
    }
  }

  const handleScroll = useCallback((ref, setter, items) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (ref.current) {
        const itemHeight = window.innerWidth < 640 ? 28 : window.innerWidth < 1024 ? 32 : 40
        const containerHeight = ref.current.clientHeight
        const scrollTop = ref.current.scrollTop
        const paddingTop = (containerHeight - itemHeight) / 2
        
        // Calculate which item should be selected based on scroll position
        // Add small offset to prevent flickering between items
        const exactIndex = (scrollTop + paddingTop) / itemHeight
        const index = Math.round(exactIndex)
        const clampedIndex = Math.max(0, Math.min(items.length - 1, index))
        
        if (items[clampedIndex] !== undefined) {
          setter(items[clampedIndex])
        }
      }
    }, 100) // Slightly increased debounce for more stable scrolling
  }, [])

  const displayValue = value ? (() => {
    const [hour, minute] = value.split(':').map(Number)
    let period, hour12
    
    if (hour === 0) {
      // 00:xx is 12:xx AM (midnight)
      period = 'AM'
      hour12 = 12
    } else if (hour < 12) {
      // 01:xx - 11:xx is AM
      period = 'AM'
      hour12 = hour
    } else if (hour === 12) {
      // 12:xx is 12:xx PM (noon)
      period = 'PM'
      hour12 = 12
    } else {
      // 13:xx - 23:xx is 01:xx - 11:xx PM
      period = 'PM'
      hour12 = hour - 12
    }
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
  })() : "Select time"

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-gradient-to-br from-white/70 to-white/40 dark:from-gray-800/70 dark:to-gray-700/40 backdrop-blur-sm border border-white/60 dark:border-gray-600/40 rounded-xl text-left text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 dark:text-white hover:from-white/80 hover:to-white/50 dark:hover:from-gray-700/80 dark:hover:to-gray-600/50 transition-all duration-200 shadow-lg group"
      >
        <div className="flex items-center justify-between">
          <span className={`font-medium ${value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {displayValue}
          </span>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full group-hover:scale-125 transition-transform duration-200"></div>
            <svg 
              className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          {/* Mobile/Touch Backdrop */}
          <div 
            className="fixed inset-0 z-modal bg-black/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute top-full left-0 right-0 z-popup mt-2 bg-gradient-to-br from-white/95 to-white/85 dark:from-gray-900/95 dark:to-gray-800/85 backdrop-blur-xl border border-white/60 dark:border-white/20 rounded-2xl shadow-2xl overflow-hidden max-w-sm mx-auto lg:max-w-none">
            <div className="p-3 sm:p-4 lg:p-6">
              {/* Header with gradient */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>{label}</span>
                </div>
              </div>
              
              {/* Modern time picker wheels with enhanced styling */}
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 lg:space-x-4">
                {/* Hours */}
                <div className="relative flex-1 max-w-[60px] sm:max-w-[70px] lg:max-w-[80px]">
                  <div className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 text-center mb-1 sm:mb-2 uppercase tracking-wider">Hour</div>
                  <div className="relative">
                    {/* Selection indicator overlay */}
                    <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-8 sm:h-10 lg:h-12 bg-gradient-to-r from-blue-500/20 to-purple-600/20 dark:from-blue-400/30 dark:to-purple-500/30 rounded-xl border-2 border-blue-500/40 dark:border-blue-400/50 shadow-lg pointer-events-none z-above"></div>
                    
                    <div 
                      ref={hourRef}
                      className="w-full h-28 sm:h-32 lg:h-36 overflow-y-auto scrollbar-hide bg-gradient-to-b from-gray-50/50 to-white/30 dark:from-gray-800/50 dark:to-gray-700/30 backdrop-blur-sm rounded-xl border border-white/40 dark:border-gray-600/30 shadow-inner touch-pan-y relative z-base"
                      style={{ 
                        scrollSnapType: 'y mandatory',
                        paddingTop: '56px',
                        paddingBottom: '56px'
                      }}
                      onScroll={() => handleScroll(hourRef, setSelectedHour, hours)}
                    >
                      <div className="flex flex-col">
                        {hours.map((hour, index) => (
                          <div
                            key={hour}
                            className={`h-7 sm:h-8 lg:h-10 flex items-center justify-center text-xs sm:text-sm lg:text-base font-medium cursor-pointer transition-all duration-300 touch-manipulation relative flex-shrink-0 z-base ${
                              selectedHour === hour 
                                ? 'text-blue-600 dark:text-blue-400 scale-110 font-bold' 
                                : 'text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:scale-105'
                            }`}
                            style={{ scrollSnapAlign: 'center' }}
                            onClick={() => {
                              setSelectedHour(hour)
                              scrollToItem(hourRef, index)
                            }}
                          >
                            {selectedHour === hour && (
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-lg"></div>
                            )}
                            <span className="relative z-above">{hour}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Separator with modern styling */}
                <div className="flex flex-col items-center space-y-1 px-1 sm:px-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg"></div>
                </div>

                {/* Minutes */}
                <div className="relative flex-1 max-w-[60px] sm:max-w-[70px] lg:max-w-[80px]">
                  <div className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 text-center mb-1 sm:mb-2 uppercase tracking-wider">Min</div>
                  <div className="relative">
                    {/* Selection indicator overlay */}
                    <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-8 sm:h-10 lg:h-12 bg-gradient-to-r from-blue-500/20 to-purple-600/20 dark:from-blue-400/30 dark:to-purple-500/30 rounded-xl border-2 border-blue-500/40 dark:border-blue-400/50 shadow-lg pointer-events-none z-above"></div>
                    
                    <div 
                      ref={minuteRef}
                      className="w-full h-28 sm:h-32 lg:h-36 overflow-y-auto scrollbar-hide bg-gradient-to-b from-gray-50/50 to-white/30 dark:from-gray-800/50 dark:to-gray-700/30 backdrop-blur-sm rounded-xl border border-white/40 dark:border-gray-600/30 shadow-inner touch-pan-y relative z-base"
                      style={{ 
                        scrollSnapType: 'y mandatory',
                        paddingTop: '56px',
                        paddingBottom: '56px'
                      }}
                      onScroll={() => handleScroll(minuteRef, setSelectedMinute, minutes)}
                    >
                      <div className="flex flex-col">
                        {minutes.map((minute, index) => (
                          <div
                            key={minute}
                            className={`h-7 sm:h-8 lg:h-10 flex items-center justify-center text-xs sm:text-sm lg:text-base font-medium cursor-pointer transition-all duration-300 touch-manipulation relative flex-shrink-0 z-base ${
                              selectedMinute === minute 
                                ? 'text-blue-600 dark:text-blue-400 scale-110 font-bold' 
                                : 'text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:scale-105'
                            }`}
                            style={{ scrollSnapAlign: 'center' }}
                            onClick={() => {
                              setSelectedMinute(minute)
                              scrollToItem(minuteRef, index)
                            }}
                          >
                            {selectedMinute === minute && (
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-lg"></div>
                            )}
                            <span className="relative z-above">{minute.toString().padStart(2, '0')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AM/PM */}
                <div className="relative flex-1 max-w-[60px] sm:max-w-[70px] lg:max-w-[80px]">
                  <div className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 text-center mb-1 sm:mb-2 uppercase tracking-wider">Period</div>
                  <div className="relative">
                    {/* Selection indicator overlay */}
                    <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-8 sm:h-10 lg:h-12 bg-gradient-to-r from-blue-500/20 to-purple-600/20 dark:from-blue-400/30 dark:to-purple-500/30 rounded-xl border-2 border-blue-500/40 dark:border-blue-400/50 shadow-lg pointer-events-none z-above"></div>
                    
                    <div 
                      ref={periodRef}
                      className="w-full h-28 sm:h-32 lg:h-36 overflow-y-auto scrollbar-hide bg-gradient-to-b from-gray-50/50 to-white/30 dark:from-gray-800/50 dark:to-gray-700/30 backdrop-blur-sm rounded-xl border border-white/40 dark:border-gray-600/30 shadow-inner touch-pan-y relative z-base"
                      style={{ 
                        scrollSnapType: 'y mandatory',
                        paddingTop: '56px',
                        paddingBottom: '56px'
                      }}
                      onScroll={() => handleScroll(periodRef, setSelectedPeriod, periods)}
                    >
                      <div className="flex flex-col">
                        {periods.map((period, index) => (
                          <div
                            key={period}
                            className={`h-7 sm:h-8 lg:h-10 flex items-center justify-center text-xs sm:text-sm lg:text-base font-medium cursor-pointer transition-all duration-300 touch-manipulation relative flex-shrink-0 z-base ${
                              selectedPeriod === period 
                                ? 'text-blue-600 dark:text-blue-400 scale-110 font-bold' 
                                : 'text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:scale-105'
                            }`}
                            style={{ scrollSnapAlign: 'center' }}
                            onClick={() => {
                              setSelectedPeriod(period)
                              scrollToItem(periodRef, index)
                            }}
                          >
                            {selectedPeriod === period && (
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-lg"></div>
                            )}
                            <span className="relative z-above">{period}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern action buttons */}
              <div className="flex space-x-2 sm:space-x-3 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-300/50 dark:border-gray-500/50 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200 touch-manipulation active:scale-95 shadow-lg relative z-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 touch-manipulation active:scale-95 shadow-lg relative z-base"
                >
                  <span className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Confirm</span>
                  </span>
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
