import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./hooks/useAuth"
import SignIn from "./components/Signin"
import SignUp from "./components/Signup"
import Dashboard from "./components/Dashboard"
import Intake from "./components/Intake"

export default function App() {
  const { session, loading } = useAuth()

  // While Supabase checks for a session
  if (loading) {
    return <div>Loading…</div>
  }

  return (
    <Routes>
      {/* Public pages */}
      <Route
        path="/signin"
        element={session ? <Navigate to="/dashboard" replace /> : <SignIn />}
      />
      <Route
        path="/signup"
        element={session ? <Navigate to="/dashboard" replace /> : <SignUp />}
      />

      {/* Protected page */}
      <Route
        path="/dashboard"
        element={session ? <Dashboard /> : <Navigate to="/signin" replace />}
      />
      <Route
        path="/intake"
        element={session ? <Intake /> : <Navigate to="/signin" replace />}
      />

      {/* Catch‑all redirect */}
      <Route
        path="*"
        element={<Navigate to={session ? "/dashboard" : "/signin"} replace />}
      />
    </Routes>
  )
}