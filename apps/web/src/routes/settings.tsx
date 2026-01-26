import { Settings } from '../components/Settings'
import { ProtectedRoute } from '../components/ProtectedRoute'

export function SettingsRoute() {
  return (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  )
}
