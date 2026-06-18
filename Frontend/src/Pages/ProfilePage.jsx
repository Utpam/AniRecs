import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { login, logout, showToast, toggleListOptimistic } from '../../store/AuthSlice.js';
import AnimeCard from '../Components/AnimeCard.jsx';
import { PageLoader } from '../Components/Loader';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Anya',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Lulu',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoro',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Goku',
];

export default function ProfilePage() {
  const authStatus = useSelector(state => state.auth.status);
  const userData = useSelector(state => state.auth.userData);
  const dispatch = useDispatch();
  const navigate = useNavigate();


  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [activeWatchlistTab, setActiveWatchlistTab] = useState('planned'); // planned, watching, completed, dropped

  // Forms states
  const [usernameInput, setUsernameInput] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingUsername, setUpdatingUsername] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  // Modals / Reset Confirmations
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ type: '', title: '', message: '' });

  // Load profile dashboard data from backend
  const fetchProfileDashboard = useCallback(async () => {
    if (!authStatus) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/user/profile-dashboard`,
        { withCredentials: true }
      );
      setProfileData(res.data);
      setUsernameInput(res.data.user.username);
    } catch (error) {
      console.error('Failed to fetch profile dashboard:', error);
      dispatch(showToast({ message: 'Failed to load profile details.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [authStatus, dispatch]);

  useEffect(() => {
    fetchProfileDashboard();
  }, [fetchProfileDashboard]);

  if (!authStatus || loading || !profileData) {
    return <PageLoader />;
  }

  const { user, watchlist, favorites } = profileData;

  // Formatting Join Date
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  // Filters watchlist by current tab status
  const filteredWatchlist = watchlist.filter(item => item.status === activeWatchlistTab);

  // Watchlist Toggle Handler
  const handleWatchlistToggle = async (animeId) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/recommendations/action`,
        { animeId, action: 'watchlist' },
        { withCredentials: true }
      );
      dispatch(login({ userData: res.data }));
      // Reload profile data to keep it fully in sync
      const dashRes = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/user/profile-dashboard`,
        { withCredentials: true }
      );
      setProfileData(dashRes.data);
      dispatch(showToast({ message: 'Watchlist updated successfully', type: 'success' }));
    } catch (error) {
      console.error('Watchlist toggle error:', error);
      dispatch(showToast({ message: 'Failed to update watchlist', type: 'error' }));
    }
  };

  // Favorite Toggle Handler
  const handleFavoriteToggle = async (animeId) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/recommendations/action`,
        { animeId, action: 'favorite' },
        { withCredentials: true }
      );
      dispatch(login({ userData: res.data }));
      const dashRes = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/user/profile-dashboard`,
        { withCredentials: true }
      );
      setProfileData(dashRes.data);
      dispatch(showToast({ message: 'Favorites updated successfully', type: 'success' }));
    } catch (error) {
      console.error('Favorite toggle error:', error);
      dispatch(showToast({ message: 'Failed to update favorites', type: 'error' }));
    }
  };

  // Move to Watchlist Handler
  const handleMoveToWatchlist = async (animeId) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/recommendations/action`,
        { animeId, action: 'move_to_watchlist' },
        { withCredentials: true }
      );
      dispatch(login({ userData: res.data }));
      const dashRes = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/user/profile-dashboard`,
        { withCredentials: true }
      );
      setProfileData(dashRes.data);
      dispatch(showToast({ message: 'Moved anime to watchlist', type: 'success' }));
    } catch (error) {
      console.error('Move to watchlist error:', error);
      dispatch(showToast({ message: 'Failed to move anime to watchlist', type: 'error' }));
    }
  };

  // Update Username Handler
  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    if (usernameInput.trim() === user.username) return;

    setUpdatingUsername(true);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_BASE_URL}/api/user/update-profile`,
        { username: usernameInput.trim() },
        { withCredentials: true }
      );
      dispatch(login({ userData: res.data }));
      setProfileData(prev => ({
        ...prev,
        user: { ...prev.user, username: res.data.username }
      }));
      dispatch(showToast({ message: 'Username updated successfully!', type: 'success' }));
    } catch (error) {
      console.error('Failed to update username:', error);
      dispatch(showToast({ message: error.response?.data?.message || 'Failed to update username.', type: 'error' }));
    } finally {
      setUpdatingUsername(false);
    }
  };

  // Change Avatar Handler
  const handleSelectAvatar = async (avatarUrl) => {
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_BASE_URL}/api/user/update-profile`,
        { avatar: avatarUrl },
        { withCredentials: true }
      );
      dispatch(login({ userData: res.data }));
      setProfileData(prev => ({
        ...prev,
        user: { ...prev.user, avatar: res.data.avatar }
      }));
      dispatch(showToast({ message: 'Avatar updated successfully!', type: 'success' }));
    } catch (error) {
      console.error('Failed to update avatar:', error);
      dispatch(showToast({ message: 'Failed to update avatar.', type: 'error' }));
    }
  };

  // Change Password Handler
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;

    setUpdatingPassword(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/user/auth/update-password`,
        { oldPassword, newPassword },
        { withCredentials: true }
      );
      setOldPassword('');
      setNewPassword('');
      dispatch(showToast({ message: 'Password updated successfully!', type: 'success' }));
    } catch (error) {
      console.error('Failed to update password:', error);
      dispatch(showToast({ message: error.response?.data?.message || 'Failed to update password.', type: 'error' }));
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_BASE_URL}/api/user/auth/logout`, {}, { withCredentials: true });
      dispatch(logout());
      dispatch(showToast({ message: 'Logged out successfully.', type: 'info' }));
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      dispatch(showToast({ message: 'Failed to logout.', type: 'error' }));
    }
  };

  // Open Reset Confirmation Modal
  const triggerResetConfirm = (type, title, message) => {
    setConfirmConfig({ type, title, message });
    setShowConfirmModal(true);
  };

  // Execute Reset
  const executeReset = async () => {
    setShowConfirmModal(false);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/user/reset-recommendations`,
        { type: confirmConfig.type },
        { withCredentials: true }
      );
      dispatch(login({ userData: res.data }));
      dispatch(showToast({ message: 'Reset performed successfully!', type: 'success' }));
      
      // If we did onboarding or profile reset, reload and go to discover/home
      if (confirmConfig.type === 'onboarding' || confirmConfig.type === 'profile') {
        navigate('/');
      } else {
        fetchProfileDashboard();
      }
    } catch (error) {
      console.error('Reset error:', error);
      dispatch(showToast({ message: 'Failed to reset preference data.', type: 'error' }));
    }
  };

  const isPreferenceEmpty = !userData?.onboardingCompleted || 
    ((userData?.coldStartPreferences?.favoriteGenres?.length || 0) === 0 && 
     (userData?.coldStartPreferences?.favoriteThemes?.length || 0) === 0);

  return (
    <div className="w-full min-h-screen text-tertiary bg-neutral font-hanken-reg pb-16 pt-24 overflow-x-hidden relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        {/* ── PROFILE HEADER ── */}
        <section className="bg-[#28161D]/55 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mb-8">
          <div className="relative group shrink-0 w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden border border-white/10 bg-slate-800 shadow-lg flex items-center justify-center">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="text-4xl text-white font-hanken-black capitalize">{user.username.charAt(0)}</div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-between w-full">
            <div className="text-center md:text-left mb-6 md:mb-4">
              <h1 className="text-3xl md:text-4xl font-hanken-black text-white tracking-tight leading-tight">
                {user.username}
              </h1>
              <p className="text-xs text-gray-500 font-hanken-light mt-1.5">
                Member since {joinDate}
              </p>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-hanken-black text-white">{user.watchedCount}</span>
                <span className="text-[10px] text-gray-500 uppercase font-hanken-bold mt-1">Watched</span>
              </div>
              <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-hanken-black text-white">{user.completedCount}</span>
                <span className="text-[10px] text-gray-500 uppercase font-hanken-bold mt-1">Completed</span>
              </div>
              <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-hanken-black text-white">{user.watchlistCount}</span>
                <span className="text-[10px] text-gray-500 uppercase font-hanken-bold mt-1">Watchlist</span>
              </div>
              <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-hanken-black text-white">{user.favoritesCount}</span>
                <span className="text-[10px] text-gray-500 uppercase font-hanken-bold mt-1">Favorites</span>
              </div>
              <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-hanken-black text-white">{user.reviewsCount}</span>
                <span className="text-[10px] text-gray-500 uppercase font-hanken-bold mt-1">Reviews</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── ONBOARDING ALERTER ── */}
        {isPreferenceEmpty && (
          <div className="bg-amber-950/45 border border-amber-500/30 backdrop-blur-md rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-[fadeIn_0.5s_ease-out]">
            <div className="text-center sm:text-left">
              <h3 className="font-hanken-bold text-base text-amber-200">Rebuild Recommendations</h3>
              <p className="text-xs text-amber-300/80 font-hanken-light mt-1">
                Your recommendation preferences are empty or reset. Get tailored picks by completing the questionnaire.
              </p>
            </div>
            <button
              onClick={() => triggerResetConfirm('onboarding', 'Build Recommendations', 'This will launch the onboarding questionnaire to initialize your preference profiles.')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-hanken-bold text-xs transition duration-300 cursor-pointer whitespace-nowrap shadow-lg shadow-amber-500/10"
            >
              Build My Recommendations
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ── LEFT COLUMN: WATCHLIST & SAVED ── */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Watchlist Section */}
            <div className="bg-[#28161D]/55 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-xl">
              <h2 className="text-xl font-hanken-bold text-white mb-5">Your Watchlist</h2>

              {/* Status Tabs */}
              <div className="flex border-b border-white/5 gap-5 mb-6 overflow-x-auto pb-1.5 scrollbar-none">
                {[
                  { id: 'planned', label: 'Planned' },
                  { id: 'watching', label: 'Watching' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'dropped', label: 'Dropped' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveWatchlistTab(tab.id)}
                    className={`text-xs md:text-sm font-hanken-bold transition duration-300 relative pb-2.5 cursor-pointer whitespace-nowrap ${
                      activeWatchlistTab === tab.id ? 'text-primary' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {activeWatchlistTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              {filteredWatchlist.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500 font-hanken-light">
                  Your watchlist is waiting for its first anime.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredWatchlist.map((item, idx) => (
                    <AnimeCard
                      key={`${item.animeId}-${idx}`}
                      item={item}
                      inWatchlist={true}
                      inFavorites={favorites.some(f => String(f.animeId) === String(item.animeId))}
                      onWatchlistToggle={handleWatchlistToggle}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Saved / Favorites Section */}
            <div className="bg-[#28161D]/55 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-xl">
              <h2 className="text-xl font-hanken-bold text-white mb-5">Saved Favorites</h2>

              {favorites.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500 font-hanken-light">
                  Save anime to quickly find them later.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {favorites.map((item, idx) => (
                    <AnimeCard
                      key={`${item.animeId}-${idx}`}
                      item={item}
                      inWatchlist={watchlist.some(w => String(w.animeId) === String(item.animeId))}
                      inFavorites={true}
                      onFavoriteToggle={handleFavoriteToggle}
                      customActions={[
                        {
                          label: 'Move to Watchlist',
                          onClick: handleMoveToWatchlist,
                        },
                      ]}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: SETTINGS SIDEBAR ── */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Account Settings */}
            <div className="bg-[#28161D]/55 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-xl">
              <h2 className="text-lg font-hanken-bold text-white mb-5">Account Settings</h2>

              {/* Avatar Preset Select */}
              <div className="mb-5">
                <span className="block text-xs font-hanken-med text-gray-400 mb-2">Select Avatar Preset</span>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_PRESETS.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectAvatar(url)}
                      className={`aspect-square rounded-xl overflow-hidden border transition cursor-pointer hover:scale-[1.05] ${
                        user.avatar === url ? 'border-primary ring-2 ring-primary/45' : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Username form */}
              <form onSubmit={handleUpdateUsername} className="space-y-3 pb-5 border-b border-white/5">
                <div>
                  <label className="block text-xs font-hanken-med text-gray-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary/50 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingUsername || usernameInput.trim() === user.username}
                  className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/80 disabled:opacity-30 text-white font-hanken-bold text-xs transition cursor-pointer"
                >
                  {updatingUsername ? 'Updating...' : 'Update Username'}
                </button>
              </form>

              {/* Password form */}
              <form onSubmit={handleUpdatePassword} className="space-y-3 pt-5 pb-5 border-b border-white/5">
                <div>
                  <label className="block text-xs font-hanken-med text-gray-400 mb-1.5">Old Password</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-hanken-med text-gray-400 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary/50 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingPassword || !oldPassword || !newPassword}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-hanken-bold text-xs transition cursor-pointer"
                >
                  {updatingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </form>

              {/* Future-Ready Settings Dummies */}
              <div className="py-4 border-b border-white/5 space-y-3 text-xs text-gray-500 font-hanken-light">
                <div className="flex items-center justify-between opacity-55">
                  <span>🔔 Notifications (Future)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">Disabled</span>
                </div>
                <div className="flex items-center justify-between opacity-55">
                  <span>🔒 Privacy & Data (Future)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">Standard</span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full mt-4 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 font-hanken-bold text-xs hover:bg-rose-600/35 transition cursor-pointer"
              >
                Log Out
              </button>
            </div>

            {/* Recommendation Settings */}
            <div className="bg-[#28161D]/55 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-4">
              <h2 className="text-lg font-hanken-bold text-white mb-2">Recommendation Engine</h2>
              
              <button
                onClick={() => triggerResetConfirm('cache', 'Reset Recommendations Cache', 'This will invalidate your recommendation engine cache and regenerate the rows matching your newest preference metrics.')}
                className="w-full py-2.5 px-4 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-hanken-med text-xs text-tertiary transition cursor-pointer flex justify-between items-center"
              >
                <span>Reset Cache</span>
                <span className="text-[10px] text-gray-500">Recalculate</span>
              </button>

              <button
                onClick={() => triggerResetConfirm('genres', 'Reset Genre Preferences', 'Resetting genre preferences will clear your selected cold-start genres, impacting your personalized category filters.')}
                className="w-full py-2.5 px-4 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-hanken-med text-xs text-tertiary transition cursor-pointer flex justify-between items-center"
              >
                <span>Reset Genre Preferences</span>
                <span className="text-[10px] text-gray-500">Clear</span>
              </button>

              <button
                onClick={() => triggerResetConfirm('themes', 'Reset Theme Preferences', 'Resetting theme preferences will clear your selected cold-start themes, impacting your personalized category filters.')}
                className="w-full py-2.5 px-4 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-hanken-med text-xs text-tertiary transition cursor-pointer flex justify-between items-center"
              >
                <span>Reset Theme Preferences</span>
                <span className="text-[10px] text-gray-500">Clear</span>
              </button>

              <button
                onClick={() => triggerResetConfirm('onboarding', 'Re-run Onboarding Questionnaire', 'This will flag your account for onboarding. The onboarding questionnaire will automatically overlay on the homepage.')}
                className="w-full py-2.5 px-4 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-hanken-med text-xs text-tertiary transition cursor-pointer flex justify-between items-center"
              >
                <span>Re-run Onboarding</span>
                <span className="text-[10px] text-gray-500">Run Questionnaire</span>
              </button>

              <button
                onClick={() => triggerResetConfirm('profile', 'Reset Recommendation Profile', 'Resetting your recommendation profile will rebuild your preferences from scratch. This clears onboarding answers, telemetry weights, and interaction logs.')}
                className="w-full py-2.5 px-4 text-left rounded-xl bg-rose-600/10 border border-rose-500/20 font-hanken-bold text-xs text-rose-300 hover:bg-rose-600/20 transition cursor-pointer flex justify-between items-center"
              >
                <span>Reset Entire Profile</span>
                <span className="text-[10px] text-rose-400">Scratch Rebuild</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONFIRMATION MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#28161D] border border-white/10 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-4">
            <h3 className="text-lg font-hanken-bold text-white">{confirmConfig.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-hanken-light">
              {confirmConfig.message}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-hanken-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-hanken-bold transition cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
