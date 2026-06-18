import { ApiError } from "../Utils/ApiError.js";
import {GenerateAccessAndRefreshToken} from '../Utils/generateToken.js';
import jwt from 'jsonwebtoken'
import {User} from '../Model/User.model.js';
import { ApiResponse } from "../Utils/ApiResponse.js";
import {Otp} from '../Model/Otp.model.js';
import { sendMail } from "../Utils/EmailSender.js";

export const signUp = async ( req, res) => {

    const {username, email, password} = req.body;
    
    // Validate Credentials
    if([username, email, password].some(field => !field || field.trim() === "")) {
        return res.status(400).json({ message: "Please fill all the credentials!" });
    }

    // Check If User Already Exist
    const userExist = await User.findOne({
        $or: [{username}, {email}]
    })

    if(userExist) {
        return res.status(401).json({ message: "User Already Exists!" });
    }

    // Create a new User
    const user = await User.create({
        username,
        email,
        password,
    })

    const {accessToken, refreshToken} = await GenerateAccessAndRefreshToken(res, user._id);

    // await res.cookie('accessToken', accessToken, {
    //     httpOnly: true,
    //     secure: true,
    //     maxAge: process.env.ACCESS_TOKEN_EXPIRY * 24 * 60 * 60 * 60
    // })

    // console.log(accessToken, refreshToken)

    return res.status(200).json(new ApiResponse(200, user, "User Registered Successfully!"));
}

export const getCurrentUser = async ( req, res) => {
    // Check For accessToken
    const { accessToken } = req.cookies;

    if (!accessToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if(accessToken) {
        const Decodedtoken = await jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        console.log(accessToken)

        if (!Decodedtoken?._id) {
            return res.status(401).json({
                message: "Invalid token"
            });
        }

        const user = await User.findById(Decodedtoken._id);

        if(user) {
            await GenerateAccessAndRefreshToken(res, Decodedtoken._id);
            return res.send( new ApiResponse(200,user) )
        }
    }
}

export const login = async (req, res) => {

    try {
        
        // Check if User Exist
    
        const {identifier, password} = req.body
    
        const userExist = await User.findOne({
            $or: [
                {username: identifier},
                {email: identifier}
            ]
        })
    
        if(!userExist) {
            console.error('User Does Not Exist!')
            return res.status(401).json({ message: "Invalid User Credentials !"});
        }
    
        // Verify Password
        
        const checkPassword = await userExist.comparePassword(password)
        
        if(!checkPassword) return res.status(400).json({message: "Invalid credentails!"})
            
        // Renew Access and Refresh Tokens and login User
    
        await GenerateAccessAndRefreshToken(res, userExist._id);
        // console.log(access)
    
        // await res.cookie('accessToken', access, {
        //     httpOnly: true,
        //     secure: true,
        //     maxAge: process.env.ACCESS_TOKEN_EXPIRY * 24 * 60 * 60 * 60
        // })
        
        return res.send(new ApiResponse(200, userExist, 'User Logged In Successfully!'))
    } catch (error) {
        console.error("Error in login: ", error)
        res.status(500).json({message: 'Login Failed!'})
    }
}

export const logout = async (req, res) => {
    // So on Logout here we are removing the access and refresh Token from the user
    const { accessToken } = req.cookies;
    const decodedToken = await jwt.decode(accessToken);
    const user = await User.findById(decodedToken._id);

    res.clearCookie('accessToken');

    await User.updateOne(
        {_id: decodedToken._id},
        {$unset: { refreshToken: ""}}
    )

    return res.status(200).json({message: "User Logged out Successfully!"})
}

export const generateOtp = async (req, res) => {
    try {
        const {email} = req.body;
    
        if( !email ) return new ApiError(401, 'Please fill user credentials!')
            
        const user = await User.findOne({email: email})

        if(!user) return res.status(404).json({message: 'User not Found!'})
            
        const otpExist = await Otp.findOne({email});
        
        if(otpExist){
            // return res.status(400).json({message: 'OTP Already Sent!'});
            // Optional: Calculate exactly how much time is left to give a friendly message
            const timeDiff = otpExist.expireAt.getTime() - Date.now();
            const secondsLeft = Math.ceil(timeDiff / 1000);

            return res.status(429).json({
                message: `An OTP was already sent. Please wait ${secondsLeft} seconds before requesting a new one.`
            });
             /* 
                RESEND OTP LOGIC
             */
        }
        
        const userOtp = await Otp.create({email})
    
        sendMail(email, {otp: userOtp.otp, username: user.username});

        return res.status(200).json({message: `Email Sent to : ${email}`,opt: userOtp.otp})

    } catch (error) {
        console.error('Error GenerateOTP:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}

export const verifyOtp = async (req, res) => {

}

export const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const { accessToken } = req.cookies;
        
        if (!accessToken) {
            return res.status(400).json({ message: 'No access token provided.' });
        }
            
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const userId = decodedToken._id;

        if (!userId) {
            return res.status(400).json({ message: 'Invalid token.' });
        }
    
        if (!oldPassword || !newPassword || oldPassword.trim().length === 0 || newPassword.trim().length === 0) {
            return res.status(400).json({ message: 'Both old and new passwords are required.' });
        }
            
        if (oldPassword === newPassword) {
            return res.status(400).json({ message: 'Old and new passwords should not match!' });
        }

        const userDoc = await User.findById(userId);
        if (!userDoc) {
            return res.status(404).json({ message: 'Failed to find user!' });
        }

        const decryptedPassword = await userDoc.comparePassword(oldPassword);
        if (!decryptedPassword) {
            return res.status(400).json({ message: 'Old password does not match!' });
        }

        userDoc.password = newPassword;
        await userDoc.save();

        return res.status(200).json({ message: `${userDoc.username}'s password updated successfully!` });
    } catch (error) {
        console.error("Error updating password:", error);
        return res.status(500).json({ message: 'Error updating password!' });
    }
}
