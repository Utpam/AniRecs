import { AnimeDoc } from "../Model/Anime.model.js";
import { AnimeMetadata } from "../Model/AnimeMetadata.model.js";
import { importAnime } from "../Utils/importService.js";
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
    const category = req.body?.category || req.params?.category;
    
    const anime = await AnimeDoc.find({ genre: { $elemMatch: { name: { $regex: new RegExp("^" + category + "$", "i") } } } }).limit(15)

    if(!anime) return res.status(400).json({message: `couldn't find anime!`})

    return res.status(200).json(anime);
}

export const ContentBasedRecommendation = async (req, res) => {
    const { categories } = req.body || {};

    const anime = await AnimeDoc.find()
}

const enrichRecommendations = async (recommendations) => {
  if (!recommendations || recommendations.length === 0) return [];
  
  const recMalIds = recommendations.map(rec => Number(rec.entry?.mal_id)).filter(id => !isNaN(id) && id > 0);
  if (recMalIds.length === 0) return recommendations;

  const localAnimes = await AnimeDoc.find({ mal_id: { $in: recMalIds } });
  const titleMap = new Map();
  localAnimes.forEach(anime => {
    titleMap.set(Number(anime.mal_id), anime.title);
  });

  return recommendations.map(rec => {
    const malId = Number(rec.entry?.mal_id);
    if (titleMap.has(malId)) {
      return {
        ...rec,
        entry: {
          ...rec.entry,
          title: titleMap.get(malId)
        }
      };
    }
    return rec;
  });
};

export const getAnimeDetail = async (req, res) => {
  try {
    const { malId } = req.params;
    if (!malId) return res.status(400).json({ message: 'Missing malId' });

    const malIdNum = Number(malId);
    let metadata = await AnimeMetadata.findOne({ mal_id: malIdNum });

    if (metadata) {
      // Enrich recommendations with local English titles from AnimeDoc
      const enrichedRecs = await enrichRecommendations(metadata.recommendations);
      const dataToSend = metadata.toObject ? metadata.toObject() : metadata;
      dataToSend.recommendations = enrichedRecs;

      // Return cached version immediately
      res.status(200).json({ data: dataToSend });

      // Check freshness: 30 days or is a stub (missing characters)
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const age = Date.now() - new Date(metadata.cachedAt || 0).getTime();
      const isStub = !metadata.characters || metadata.characters.length === 0;

      if (age > THIRTY_DAYS_MS || isStub) {
        if (isStub) {
          console.log(`[Details] Cached document is a stub. Importing details in background for ID ${malId}...`);
        } else {
          console.log(`[Details] Cache expired for ID ${malId}. Refreshing in background...`);
        }
        importAnime(malIdNum).catch(err => {
          console.error(`[Details] Background import failed for ID ${malId}:`, err.message);
        });
      }
      return;
    }

    // If not found in database, import synchronously
    console.log(`[Details] Anime details not found locally for ID ${malId}. Importing synchronously...`);
    try {
      const importedDoc = await importAnime(malIdNum);
      const enrichedRecs = await enrichRecommendations(importedDoc.recommendations);
      const dataToSend = importedDoc.toObject ? importedDoc.toObject() : importedDoc;
      dataToSend.recommendations = enrichedRecs;

      return res.status(200).json({ data: dataToSend });
    } catch (err) {
      return res.status(500).json({ message: 'Failed to retrieve anime info', error: err.message });
    }
  } catch (error) {
    console.error("getAnimeDetail error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};