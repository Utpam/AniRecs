import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'
import Navbar from './Navbar'
import FallingParticles from '../Components/FallingParticles';
import bg1 from '../assets/bg1.svg';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {login, hideToast} from '../../store/AuthSlice.js'
import ColdStartModal from './ColdStartModal';


function HomePageLayout() {
  const authStatus = useSelector(state => state.auth.status);
  const userData = useSelector(state => state.auth.userData);
  const toast = useSelector(state => state.toast);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/api/user/getuser`,
          {
            withCredentials: true,
          }
        );

        await dispatch(login({ userData: response.data }))
      } catch (error) {
        console.error(error);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        dispatch(hideToast());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, dispatch]);

  const handleColdStartComplete = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/user/getuser`,
        { withCredentials: true }
      );
      dispatch(login({ userData: response.data }));
      navigate('/discover');
    } catch (e) {
      console.error(e);
      navigate('/discover');
    }
  };

  return (
    <div className=''>
        <FallingParticles />
        <Navbar />
        {authStatus && userData && !userData.onboardingCompleted && (
          <ColdStartModal onComplete={handleColdStartComplete} />
        )}
        <Outlet />

        {/* Global Toast Notification */}
        {toast.visible && (
          <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 animate-[fadeIn_0.3s_ease-out] transition-all duration-300 ${
            toast.type === 'error'
              ? 'bg-rose-950/85 border-rose-500/50 text-rose-200'
              : toast.type === 'success'
              ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-200'
              : 'bg-[#28161D]/85 border-primary/40 text-tertiary'
          }`}>
            {toast.type === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-hanken-med">{toast.message}</span>
            <button onClick={() => dispatch(hideToast())} className="ml-2 text-white/50 hover:text-white transition cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
    </div>
  )
}

export default HomePageLayout