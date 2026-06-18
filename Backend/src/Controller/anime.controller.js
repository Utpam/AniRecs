import { AnimeDoc } from "../Model/Anime.model.js";
import axios from 'axios'
import { ApiError } from "../Utils/ApiError.js";

// temporary to fetch and save data from MAL
export const setAnime = async (req, res) => {
    
    try {
        for(let page = 56; page <= 60; page++) {
        const response = await axios.get(
            `https://api.jikan.moe/v4/top/anime?page=${page}`
        );

        const data = response.data.data
        
        for(const anime of data){
            // check if anime exists, if not then upsert/create a document
                await AnimeDoc.updateOne(
                    { mal_id: anime.mal_id },
                    {
                        $set: {
                            title: anime.title_english || anime.title,
                            image: anime.images.jpg.large_image_url,
                            synopsis: anime.synopsis,
                            genre: anime.genres,
                            year: anime.aired?.prop?.from?.year,
                            mal_rating: anime.score,
                        }
                    },
                    { upsert: true }
                );
            }
        }

    const count = await AnimeDoc.countDocuments({});
    return res.status(200).json({message: `Fetched anime ${count}`})

    } catch (error) {
        console.log('Error: ', error)
        return res.status(500).json({message: 'Something went wrong!'})
    }
}

export const getAnime = async (req, res) => {
    try {
        const { mal_id } = req.body;

        const data = await axios.get(`https://api.jikan.moe/v4/anime/${mal_id}/full`)

        console.log(data.data)
    
        return res.status(200).json(data.data)
    } catch (error) {
        return res.send(new ApiError(500, "Error to get anime info"))
    }
}

export const getByCategory = async (req, res) => {
    const {category} = req.body || {};
    
    const anime = await AnimeDoc.find({genre: {$elemMatch: {name: category}}}).limit(15)

    if(!anime) return res.status(400).json({message: `couldn't find anime!`})

    return res.status(200).json(anime);
}

export const ContentBasedRecommendation = async (req, res) => {
    const { categories } = req.body || {};

    const anime = await AnimeDoc.find()
}