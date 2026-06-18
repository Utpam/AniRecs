import mongoose from "mongoose";
import { ApiError } from "../Utils/ApiError.js";

export const connectDB = async () => {
    try {
        const dbInstance = await mongoose.connect(`${process.env.MONGODB_URI}`);
        console.log("Database Connection Successfull: ", dbInstance.connection.host)
    
    } catch (error) {
        console.log("MongoDB failed ", error)
        process.exit(1);
    }
}