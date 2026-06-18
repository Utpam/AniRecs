import React, { useEffect, useState } from 'react'
import AniRecsLogo from '../assets/AniRecsLogo.svg'
import Input from './Input'
import usericon from '../assets/user.svg'
import locked from '../assets/locked-computer.svg'
import Button from './Button'
import show from '../assets/show.svg'
import hide from '../assets/hide.svg'
import emailIcon from '../assets/email.svg'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {BtnLoader, PageLoader} from './Loader.jsx'
import { useSelector, useDispatch } from 'react-redux';
import {login} from '../../store/AuthSlice.js'

function SignUpCard() {

    const authStatus = useSelector(state => state.auth.AuthStatus);
    const userData = useSelector(state => state.auth.userData);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword,setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const UsernameRegexPattern = /^[A-Za-z0-9][A-Za-z0-9@#$\-_]{2,19}$/
    const EmailRegexPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const PasswordRegexPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if([username, email, password].some((field) => field.trim() === '')){
            setError('Please enter all credentials!')
            return;
        }

        if (!UsernameRegexPattern.test(username)) {
            setError('Usernames can only contain alphanumeric characters, underscores, hyphens, and standard symbols (@, #, $, _)');
            return;
        }

        if (!EmailRegexPattern.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!PasswordRegexPattern.test(password)) {
            setError('Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character (@$!%*?&_)');
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/api/user/auth/signup`,
                {
                    username,
                    email,
                    password
                },
                axios.defaults.withCredentials = true
            );

            if(!response || response.statusCode >= 400) {
                setError(response?.message || 'Something went wrong when logging in!')
                return;
            }

            console.log(response.data)
            dispatch(login({userData: response.data.data}))
            navigate('/')


        } catch (err) {
            setError(
                err.response?.message ||
                'Something went wrong'
            );
        } finally {
            setLoading(false);
        }
    };
        
    return (
    <div className='border-1 border-tertiary/15 w-[400px] flex flex-col gap-2 relative justify-self-center py-5 place-items-center top-[20vh] bg-neutral/50 backdrop-blur-lg rounded-2xl'>
        <section className='flex place-items-center'>
            <img src={AniRecsLogo} width={'200px'} className='select-none py-4' />
        </section>
        <p className='text-red-400 text-[1rem] p-2'>{error}</p>
        <section>
            <form className='' onSubmit={handleSubmit}>
                {/* Username */}
                <label className='mx-2'>Username</label>
                <div className='border-2 mb-4 gap-2 bg-neutral/50 border-1 border-tertiary/10 m-2 p-2 rounded-lg flex relative place-items-center w-[350px]' title='eg: username_123'>
                <span className=''>
                    <img src={usericon} width={'20px'} className='opacity-50 select-none' />
                </span>
                <input 
                    type='text'
                    className='rounded-[10px] outline-none p-2 text-[1rem] w-full font-hanken-reg'
                    onChange={(e) => setUsername(e.target.value)}
                    value={username}
                    />
                </div>

                {/* Email */}
                <label className='mx-2'>Email</label>
                <div className='border-2 mb-4 gap-2 bg-neutral/50 border-1 border-tertiary/10 m-2 p-2 rounded-lg flex relative place-items-center w-[350px]' title='eg: test@email.com'>
                <span className=''>
                    <img src={emailIcon} width={'20px'} className='opacity-50 select-none' />
                </span>
                <input 
                    type='text'
                    className='rounded-[10px] outline-none p-2 text-[1rem] w-full font-hanken-reg'
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    />
                </div>

                {/* Password */}
                <label className='mx-2'>Password</label>
                <div className='border-2 gap-2 bg-neutral/50 border-1 border-tertiary/10 m-2 p-2 rounded-lg flex relative place-items-center w-[350px]' title='Should be atleast 8 charaters'>
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
                    {!loading ? <p className='w-full text-center'>Sign Up</p>: <BtnLoader />}
                </button>
            </form>
        </section>
    </div>
  )
}

export default SignUpCard