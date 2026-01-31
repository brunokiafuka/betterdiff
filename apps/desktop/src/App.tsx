import { useState, useEffect } from 'react'
import { AppShell } from './components/AppShell'
import { Welcome } from './components/Welcome'
import { Settings } from './components/Settings'
import { FileExplorerView } from './components/FileExplorerView'
import { useAppStore } from './stores/appStore'

function App() {
  const { currentRepo } = useAppStore()
  const [showSettings, setShowSettings] = useState(false)
  const [hasConfig, setHasConfig] = useState<boolean | null>(null)

  useEffect(() => {
    const checkConfig = async () => {
      const exists = await window.electronAPI.config.exists()
      setHasConfig(exists)
    }
    checkConfig()
  }, [])

  // Listen for open-settings event from Welcome page
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true)
    }

    window.addEventListener('open-settings', handleOpenSettings)

    // Listen for menu events from main process
    // @ts-ignore - onMenuAction is defined in preload
    const cleanupSettings = window.electronAPI.onMenuAction('open-settings', () => {
      setShowSettings(true)
    })
    // @ts-ignore - onMenuAction is defined in preload
    const cleanupRemote = window.electronAPI.onMenuAction('open-remote-repo', () => {
      window.dispatchEvent(new CustomEvent('menu:open-remote-repo'))
    })
    // @ts-ignore - onMenuAction is defined in preload
    const cleanupLocal = window.electronAPI.onMenuAction('open-local-repo', () => {
      window.dispatchEvent(new CustomEvent('menu:open-local-repo'))
    })

    return () => {
      window.removeEventListener('open-settings', handleOpenSettings)
      cleanupSettings()
      cleanupRemote()
      cleanupLocal()
    }
  }, [])

  // Show settings if explicitly opened
  if (showSettings) {
    return (
      <AppShell onSettingsClick={() => setShowSettings(false)}>
        <Settings onClose={() => setShowSettings(false)} />
      </AppShell>
    )
  }

  // Show welcome if no config
  if (hasConfig === false) {
    return (
      <AppShell onSettingsClick={() => setShowSettings(true)}>
        <Welcome />
      </AppShell>
    )
  }

  // Show main content
  return (
    <AppShell onSettingsClick={() => setShowSettings(true)}>
      {!currentRepo ? (
        <Welcome />
      ) : (
        <FileExplorerView />
      )}
    </AppShell>
  )
}

export default App
