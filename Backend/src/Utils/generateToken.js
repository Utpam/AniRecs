import jwt from 'jsonwebtoken';
import { ApiResponse } from "./ApiResponse.js"
import { User } from '../Model/User.model.js';

export const GenerateAccessAndRefreshToken = async (res, userId) => {
    try {
        const user = await User.findById(userId);
        if(!user) throw new Error("User not found");

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        await res.cookie('accessToken', accessToken, {httpOnly: true, maxAge: 1 * 24 * 60 * 60 * 1000})
        
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {
            accessToken, refreshToken
        }
    
    } catch (error) {
        console.log("Error to Generate JWT: ", error);
        throw error;
    }
}