import mongoose, { Schema } from 'mongoose';

const reviewSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    animeId: {
        type: Schema.Types.ObjectId,
        ref: 'AnimeDoc',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 0.5,
        max: 10
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    review: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }]
}, { timestamps: true });

// Prevent duplicate reviews by the same user on the same anime
reviewSchema.index({ animeId: 1, userId: 1 }, { unique: true });

export const AnimeReview = mongoose.model('AnimeReview', reviewSchema);
