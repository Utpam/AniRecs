import { configureStore } from '@reduxjs/toolkit';
import {AuthReducer, UserReducer, ToastReducer} from './AuthSlice.js'

export const store = configureStore({
    reducer:{
        auth: AuthReducer,
        user: UserReducer,
        toast: ToastReducer
    }
})

