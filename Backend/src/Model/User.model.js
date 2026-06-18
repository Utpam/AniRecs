import mongoose, {mongo, Schema} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

const userSchema = Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        match: [/^[A-Za-z0-9][A-Za-z0-9@#$\-_]{2,19}$/, "Usernames can only contain alphanumeric characters, underscores, hyphens, and standard symbols (@, #, $, _)"]
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email address!"]
    },
    password: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                if (v && v.startsWith('$2') && v.length === 60) {
                    return true;
                }
                const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/;
                return regex.test(v);
            },
            message: "Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character (@$!%*?&_)"
        }
    },
    accessToken: {
        type: String
    },
    refreshToken: {
        type: String
    },
    avatar: {
        type: String,
        default: ""
    },
    watchlist: [{
        animeId: { type: String, required: true },
        status: {
            type: String,
            enum: ['watching', 'planned', 'completed', 'dropped'],
            default: 'planned'
        },
        updatedAt: { type: Date, default: Date.now }
    }],
    completedAnime: {
        type: [String],
        default: []
    },
    watchedAnime: {
        type: [String],
        default: []
    },
    favorites: {
        type: [String],
        default: []
    },
    dropped: {
        type: [String],
        default: []
    },
    ratings: [{
        animeId: String,
        rating: Number,
        updatedAt: { type: Date, default: Date.now }
    }],
    interactions: [{
        animeId: String,
        type: { type: String }, // 'click', 'ignore', 'watchlist', 'favorite', 'rate', 'complete', 'drop', 'hide'
        weight: Number,
        updatedAt: { type: Date, default: Date.now }
    }],
    coldStartPreferences: {
        favoriteAnime: { type: [String], default: [] },
        favoriteGenres: { type: [String], default: [] },
        favoriteThemes: { type: [String], default: [] }
    },
    cachedRecommendations: {
        data: { type: Schema.Types.Mixed, default: null },
        updatedAt: { type: Date }
    },
    onboardingCompleted: {
        type: Boolean,
        default: false
    }
    
}, {timestamps: true}) 


// Hash Password
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
})

// compare password
userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign({_id: this._id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({_id: this._id}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: process.env.REFRESH_TOKEN_EXPIRY});
}

export const User = mongoose.model("User", userSchema);