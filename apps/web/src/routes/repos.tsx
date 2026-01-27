import { Repos } from '../components/Repos'
import { ProtectedRoute } from '../components/ProtectedRoute'

export function ReposRoute() {
  return (
    <ProtectedRoute>
      <Repos />
    </ProtectedRoute>
  )
}
