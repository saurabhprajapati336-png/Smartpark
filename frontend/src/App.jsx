
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { lazy, Suspense } from "react";

// LAZY LOADING
const Signup = lazy(() => import("./Signup"));
const Login = lazy(() => import("./Login"));
const Parking = lazy(() => import("./Parking"));
const MyBookings = lazy(() => import("./MyBookings"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminUsers = lazy(() => import("./AdminUsers"));
const Profile = lazy(() => import("./Profile"));
const ForgotPassword = lazy(() => import("./ForgotPassword"));

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

// LOADING COMPONENT
function Loading() {
  return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner}></div>
      <p>Loading SmartPark...</p>
    </div>
  );
}

const styles = {
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
    color: "#2563eb",
    gap: "12px",
  },

  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #dbeafe",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "smartpark-spin 0.8s linear infinite",
  },
};

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/signup" replace />} />

          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            path="/parking"
            element={
              <ProtectedRoute>
                <Parking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<Navigate to="/signup" replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
