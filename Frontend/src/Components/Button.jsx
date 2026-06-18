 import React from 'react'
import { NavLink } from 'react-router-dom'

function Button({children, path, className}) {
  return (
    <div className={`w-fit p-2 rounded-[20px] font-hanken-bold px-5 ${className}`}>
        <NavLink to={path}>{children}</NavLink>
    </div>
  )
}

export default Button