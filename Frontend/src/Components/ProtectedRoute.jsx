import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router';

/**
 * ProtectedRoute
 *
 * Wraps any route that requires the user to be authenticated.
 * If not logged in, redirects to /login while preserving the
 * intended destination in `location.state.from` so the login
 * page can redirect back after a successful login.
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="profile" element={<ProfilePage />} />
 *     <Route path="discover" element={<RecommendationPage />} />
 *   </Route>
 */
import { Outlet } from 'react-router';

export default function ProtectedRoute() {
  const authStatus = useSelector(state => state.auth.status);
  const location   = useLocation();

  if (!authStatus) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}
