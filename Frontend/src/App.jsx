import { Route, Routes } from 'react-router'
import HomePageLayout from './Components/HomePageLayout.jsx'
import ProtectedRoute from './Components/ProtectedRoute.jsx'
import HomePage from './Pages/HomePage.jsx'
import LoginPage from './Pages/LoginPage.jsx'
import SignUpPage from './Pages/SignUpPage.jsx'
import CategoryPage from './Pages/CategoryPage.jsx'
import Infopage from './Pages/Infopage.jsx'
import RecommendationPage from './Pages/RecommendationPage.jsx'
import SearchPage from './Pages/SearchPage.jsx'
import ProfilePage from './Pages/ProfilePage.jsx'
import GenrePage from './Pages/GenrePage.jsx'

function App() {
  return (
    <Routes>
      <Route path='/' element={<HomePageLayout />}>

        {/* ── Public routes ── */}
        <Route index element={<HomePage />} />
        <Route path='login'                    element={<LoginPage />} />
        <Route path='signup'                   element={<SignUpPage />} />
        <Route path='genres'                   element={<GenrePage />} />
        <Route path='category/:genre'          element={<CategoryPage />} />
        <Route path='anime/:title/:mal_id'     element={<Infopage />} />
        <Route path='search'                   element={<SearchPage />} />
        <Route path='explore'                  element={<SearchPage />} />

        {/* ── Protected routes (require login) ── */}
        <Route element={<ProtectedRoute />}>
          <Route path='profile'                  element={<ProfilePage />} />
          <Route path='recommendations/settings' element={<ProfilePage />} />
          <Route path='account'                  element={<ProfilePage />} />
          <Route path='user/*'                   element={<ProfilePage />} />
          <Route path='discover'                 element={<RecommendationPage />} />
        </Route>

      </Route>
    </Routes>
  )
}

export default App
