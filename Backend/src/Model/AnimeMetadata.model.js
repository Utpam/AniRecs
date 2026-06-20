import { Schema, mongoose } from "mongoose";

const animeMetadataSchema = Schema({
    mal_id: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    title_english: {
        type: String,
        default: ''
    },
    title_japanese: {
        type: String,
        default: ''
    },
    synopsis: {
        type: String,
        default: ''
    },
    background: {
        type: String,
        default: ''
    },
    images: {
        type: Object,
        default: {}
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
    trailer: {
        type: Object,
        default: {}
    },
    relations: {
        type: Array,
        default: []
    },
    characters: {
        type: Array,
        default: []
    },
    streaming: {
        type: Array,
        default: []
    },
    external: {
        type: Array,
        default: []
    },
    theme: {
        type: Object,
        default: {}
    },
    recommendations: {
        type: Array,
        default: []
    },
    score: {
        type: Number,
        default: 0
    },
    rank: {
        type: Number,
        default: null
    },
    popularity: {
        type: Number,
        default: null
    },
    episodes: {
        type: Number,
        default: null
    },
    duration: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        default: ''
    },
    season: {
        type: String,
        default: ''
    },
    year: {
        type: Number,
        default: null
    },
    cachedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export const AnimeMetadata = mongoose.model('AnimeMetadata', animeMetadataSchema);
