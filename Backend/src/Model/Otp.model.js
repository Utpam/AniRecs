import mongoose, { model, Schema } from "mongoose";
import {randomInt} from 'crypto';

const otpSchema = Schema({
    email: {
        type: String,
        ref: "User",
        required: true
    },
    otp: {
        type: Number,
    },
    expireAt: {
        type: Date,
        expires: 0
    }
})

otpSchema.pre('save', async function(next) {
    try {
        const otp = randomInt(1000, 10000);
        this.otp = otp
        this.expireAt =  new Date(Date.now() + 5 * 60 * 1000);    // Expire after 5 minutes

    } catch (error) {
        console.log("Error: ", error)
        throw error
    }
})

export const Otp = mongoose.model("Otp", otpSchema)