import { Schema, mongoose } from "mongoose";

// anime 

const animeSchema = Schema({
    mal_id: {
        type: Number,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
    },
    synopsis: {
        type: String,
    },
    genre: {
        type: Array,
    },
    year: {
        type: Number,
    },
    mal_rating: {
        type: Number
    },
    genres: {
        type: Array,
        default: []
    },
    themes: {
        type: Array,
        default: []
    },
    demographics: {
        type: Array,
        default: []
    },
    studios: {
        type: Array,
        default: []
    },
    source: {
        type: String,
        default: ''
    },
    score: {
        type: Number,
        default: 0
    },
    popularity: {
        type: Number,
        default: 0
    },
    tags: {
        type: [String],
        default: []
    },
    featureVector: {
        type: Schema.Types.Mixed,
        default: {}
    },
    averageUserRating: {
        type: Number,
        default: 0
    },
    ratingCount: {
        type: Number,
        default: 0
    }

})

export const AnimeDoc = new mongoose.model('AnimeDoc', animeSchema)
 