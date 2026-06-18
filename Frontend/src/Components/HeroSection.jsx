import React from 'react';
import bg1 from '../assets/bg1.svg';
import Button from './Button';
import arrow from '../assets/arrow-right.svg';
import { NavLink } from 'react-router-dom';

function HeroSection() {
  return (
    <div className=''>
        <div className='relative top-[300px] left-[50px] w-fit animate-[fadeIn_1s_ease-out]'>
            <section className=''>
                <p className='text-7xl font-hanken-black'>
                    Your Next Favorite
                    <br/>
                    <span className='text-primary'> Anime </span>
                    Starts Here
                </p>
            </section>

            <p className='max-w-[600px] my-2'>Personalized recommendations tailored just for you. Discover your next obsession today with our advanced discovery engine</p>

            <section className='flex relative gap-4 mt-2'>
                    <NavLink to={'/login'} className={`flex gap-2 group bg-tertiary w-fit text-primary-dark p-2 rounded-[20px] font-hanken-bold px-5 transition hover:bg-primary `}>Get Started <img src={arrow} width={'15px'} className='group-hover:translate-x-1 transition' /></NavLink>
                    <NavLink path={'/catalogue'} className={`bg-neutral/50 border-1 border-primary/25 hover:bg-primary-dark/50 transition group w-fit p-2 rounded-[20px] font-hanken-bold px-5 `} >Browse Catalog</NavLink>
            </section>
        </div>
    </div>
  )
}

export default HeroSection
