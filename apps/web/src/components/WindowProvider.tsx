import React, { createContext, useContext, useEffect, useState } from 'react'

interface WindowContextValue {
  isMobile: boolean
}

const WindowContext = createContext<WindowContextValue>({
  isMobile: false,
})

interface WindowProviderProps {
  children: React.ReactNode
}

export const WindowProvider: React.FC<WindowProviderProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      if (typeof window === 'undefined') return
      setIsMobile(window.innerWidth < 900)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return (
    <WindowContext.Provider value={{ isMobile }}>
      {children}
    </WindowContext.Provider>
  )
}

export const useWindowInfo = () => useContext(WindowContext)

