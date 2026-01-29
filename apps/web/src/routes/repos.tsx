import { Welcome } from '../components/Welcome'
import { ProtectedRoute } from '../components/ProtectedRoute'

export function ReposRoute() {
  return (
    <ProtectedRoute>
      <Welcome />
    </ProtectedRoute>
  )
}
