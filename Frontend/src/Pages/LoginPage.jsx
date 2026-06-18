import React from 'react'
import LoginCard from '../Components/LoginCard'
import bg1 from '../assets/Bg1.svg'
import FallingParticles from '../Components/FallingParticles'

function LoginPage() {
  return (
    <div>
        {/* <img src={bg1} className='bgImg opacity-20 fixed' /> */}
        <FallingParticles />
        <LoginCard />
    </div>
  )
}

export default LoginPage