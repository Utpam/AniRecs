import React, { useState } from 'react'
import AniRecsLogo from '../assets/AniRecsLogo.svg'
import usericon from '../assets/user.svg'
import locked from '../assets/locked-computer.svg'
import show from '../assets/show.svg'
import hide from '../assets/hide.svg'
import { NavLink, useAsyncError, useNavigate } from 'react-router-dom'
import {useDispatch, useSelector} from 'react-redux'
import { BtnLoader } from './Loader'
import axios from 'axios'
import {login} from '../../store/AuthSlice.js'

function LoginCard() {

    const authStatus = useSelector(state => state.auth.AuthStatus)
    const userData = useSelector(state => state.auth.userData);
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false)
    const [showPassword,setShowPassword] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if(identifier.trim() === "" || password.trim() === "") {
            setError('fill all the credentials!')
            return
        }
        try {
            setLoading(true);
            const response = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/api/user/auth/login`,
                {
                    identifier,
                    password
                },
                axios.defaults.withCredentials = true
            )
            const data = response.data.data;
            // console.log(data)

            await dispatch(login({userData: response.data.data}))
            setLoading(false)
            navigate('/')

        } catch(err) {
            setLoading(false)
            
            // Check if the server responded with an error status (like 400 or 401)
            if (err.response) {
                // Adjust 'err.response.data.message' based on your backend JSON format
                const backendMessage = err.response.data?.message || 'Invalid credentials or bad request.';
                setError(backendMessage);
            } 
            // Check if the request was sent but no response came back (network down)
            else if (err.request) {
                setError('No response from server. Please check your internet connection.');
            } 
            // Something went wrong setting up the request configuration
            else {
                setError('An unexpected error occurred. Please try again.');
            }
        }
    }

  return (
    <div className='border-1 border-tertiary/15 w-[400px] flex flex-col gap-2 relative justify-self-center py-5 place-items-center top-[20vh] bg-neutral/50 backdrop-blur-lg rounded-2xl'>
        <section className='flex place-items-center'>
            <img src={AniRecsLogo} width={'200px'} className='select-none py-4' />
        </section>
        <p className='text-red-400 text-[1rem] p-2'>{error}</p>
        <section>
            <form className='' onSubmit={handleSubmit}>
                {/* Username and Email */}
                <label className='mx-2'>Username or Email</label>
                <div className='border-2 mb-4 gap-2 bg-neutral/50 border-1 border-tertiary/10 m-2 p-2 rounded-lg flex relative place-items-center w-[350px]' title='Enter Username or Email'>
                <span className=''>
                    <img src={usericon} width={'20px'} className='opacity-50 select-none' />
                </span>
                <input 
                    type='text'
                    className='rounded-[10px] outline-none p-2 text-[1rem] w-full font-hanken-reg'
                    onChange={(e) => setIdentifier(e.target.value)}
                    value={identifier}
                    />
                </div>

                {/* Password */}
                <label className='mx-2'>Password</label>
                <div className='border-2 gap-2 bg-neutral/50 border-1 border-tertiary/10 m-2 p-2 rounded-lg flex relative place-items-center w-[350px]' title='Enter your password'>
                <span className=''>
                    <img src={locked} width={'25px'} className='opacity-50 select-none' />
                </span>
                <input 
                    type={ showPassword ? 'text' : 'password'}
                    className='rounded-[10px] outline-none p-2 text-[1rem] w-full font-hanken-reg'
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                />
                <span className='mx-2' onClick={() => setShowPassword(!showPassword)}>
                    <img src={ showPassword ? show : hide } width={'25px'} className='opacity-50 select-none cursor-pointer' />
                </span>
                </div>
                <section aria-label='forget password'>
                    <NavLink to={'/forget-password'} className='text-end block m-2 font-hanken-light text-[15px] hover:text-primary  '>forgetPassword?</NavLink>
                </section>
                <button type='submit' className='p-2 m-2 mt-4 font-hanken-bold transition-all text-primary-dark bg-tertiary hover:bg-primary hover:text-tertiary  hover:text-[1.3rem] w-[350px] rounded-3xl text-[1.2rem] cursor-pointer'
                disabled={loading}>
                    {!loading ? <p className='w-full text-center'>Login</p>: <BtnLoader />}
                </button>
            </form>
        </section>
    </div>
  )
}

export default LoginCard