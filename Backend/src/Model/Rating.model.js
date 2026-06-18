import mongoose, { Schema } from 'mongoose';

const ratingSchema = new Schema({
    animeId: {
        type: Schema.Types.ObjectId,
        ref: 'AnimeDoc',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 0.5,
        max: 10
    }
}, { timestamps: true });

// Prevent duplicate ratings by the same user on the same anime
ratingSchema.index({ animeId: 1, userId: 1 }, { unique: true });

export const AnimeRating = mongoose.model('AnimeRating', ratingSchema);
