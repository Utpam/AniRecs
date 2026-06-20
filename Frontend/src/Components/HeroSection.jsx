import React from 'react';
import bg1 from '../assets/bg1.svg';
import Button from './Button';
import arrow from '../assets/arrow-right.svg';
import { NavLink } from 'react-router-dom';

function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-neutral min-h-[55vh] flex flex-col justify-center">
      {/* Confined Hero Background Image */}
      <img
        src="./bg2.svg"
        alt="Hero Background"
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
      />
      {/* Gradient overlay to transition content background */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral via-neutral/50 to-transparent pointer-events-none" />

      {/* Hero Content */}
      <div className="relative z-10 w-full px-6 md:px-12 pt-24 pb-8 max-w-7xl mx-auto animate-[fadeIn_1s_ease-out]">
        <div className="w-fit">
          <section className="">
            <p className="text-5xl md:text-7xl font-hanken-black leading-tight">
              Your Next Favorite
              <br />
              <span className="text-primary"> Anime </span>
              Starts Here
            </p>
          </section>

          <p className="max-w-[600px] my-4 text-sm md:text-base text-gray-300 font-hanken-light">
            Personalized recommendations tailored just for you. Discover your next obsession today with our advanced discovery engine
          </p>

          <section className="flex gap-4 mt-6">
            <NavLink to="/login" className="flex items-center gap-2 group bg-tertiary w-fit text-primary-dark p-2 rounded-[20px] font-hanken-bold px-5 transition hover:bg-primary hover:text-white">
              Get Started <img src={arrow} width="15px" className="group-hover:translate-x-1 transition" alt="" />
            </NavLink>
            <NavLink to="/search" className="flex items-center gap-2 bg-neutral/50 border border-primary/25 hover:bg-primary-dark/50 transition group w-fit p-2 rounded-[20px] font-hanken-bold px-5">
              Browse Catalog
            </NavLink>
          </section>
        </div>
      </div>
    </section>
  );
}

export default HeroSection
