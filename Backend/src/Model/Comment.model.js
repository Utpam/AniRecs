import mongoose, { Schema } from 'mongoose';

const commentSchema = new Schema({
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
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    spoilers: {
        type: Boolean,
        default: false
    },
    parentId: {
        type: Schema.Types.ObjectId,
        ref: 'AnimeComment',
        default: null
    }
}, { timestamps: true });

export const AnimeComment = mongoose.model('AnimeComment', commentSchema);
