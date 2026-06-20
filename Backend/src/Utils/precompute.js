import mongoose from 'mongoose';
import { AnimeDoc } from '../Model/Anime.model.js';
import { computeFeatureVector } from './recommendationHelper.js';

const MONGODB_URI = "mongodb://utpamchaki3090_db_user:Utpam2006@ac-si0oyi2-shard-00-00.qb7fuje.mongodb.net:27017,ac-si0oyi2-shard-00-01.qb7fuje.mongodb.net:27017,ac-si0oyi2-shard-00-02.qb7fuje.mongodb.net:27017/?ssl=true&replicaSet=atlas-9u6dwx-shard-0&authSource=admin&appName=Cluster0";

async function run() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(MONGODB_URI);
    console.log("Database Connected successfully!");

    const allAnime = await AnimeDoc.find({});
    console.log(`Found ${allAnime.length} anime titles to process.`);

    let processed = 0;
    for (const anime of allAnime) {
      const vector = computeFeatureVector(anime);
      
      let tags = anime.tags || [];
      if (tags.length === 0) {
        const genres = (anime.genre && anime.genre.length) ? anime.genre : (anime.genres || []);
        const themes = anime.themes || [];
        const demographics = anime.demographics || [];
        const gTags = genres.map(g => (g.name || g || '').toLowerCase());
        const tTags = themes.map(t => (t.name || t || '').toLowerCase());
        const dTags = demographics.map(d => (d.name || d || '').toLowerCase());
        tags = [...new Set([...gTags, ...tTags, ...dTags])].filter(Boolean);
      }

      await AnimeDoc.updateOne(
        { _id: anime._id },
        { 
          $set: { 
            featureVector: vector,
            tags: tags
          } 
        }
      );
      processed++;
      if (processed % 10 === 0) {
        console.log(`Processed ${processed}/${allAnime.length} entries...`);
      }
    }

    console.log(`Successfully completed precomputations! Processed ${processed} anime.`);
  } catch (error) {
    console.error("Migration script failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from Database.");
  }
}

run();
