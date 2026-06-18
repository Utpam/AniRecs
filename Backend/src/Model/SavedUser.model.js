import mongoose, {mongo, Schema} from "mongoose";

const SavedUserSchema = Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        require: true,
        unique: true
    },
    watchlist: {
        type: Array
    },
    watched: {
        type: Array
    }
})

export const SavedUser = mongoose.model("SavedUser", SavedUserSchema)