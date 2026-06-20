import cron from 'node-cron';
import { fetchJikanPages, importAnime } from './importService.js';

export const initCronJobs = () => {
  console.log('[Cron] Initializing background sync jobs...');

  const syncAnimeList = async (endpoint, params, targetCount, jobName) => {
    console.log(`[Sync] Starting ${jobName}...`);
    try {
      const items = await fetchJikanPages(endpoint, params, targetCount);
      console.log(`[Sync] ${jobName} retrieved ${items.length} items from Jikan.`);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          // Check if already fully imported and cached recently
          await importAnime(item.mal_id);
        } catch (err) {
          console.error(`[Sync] Failed to import anime ID ${item.mal_id} in ${jobName}:`, err.message);
        }
        // Stagger to avoid hitting Jikan rate limits (1.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      console.log(`[Sync] Completed ${jobName}.`);
    } catch (err) {
      console.error(`[Sync] Error in ${jobName}:`, err.message);
    }
  };

  // Top Anime Sync: every 12 hours (00:00, 12:00)
  cron.schedule('0 0,12 * * *', () => {
    syncAnimeList('https://api.jikan.moe/v4/top/anime', {}, 50, 'Top Anime Sync');
  });

  // Popular Anime Sync: every 12 hours (03:00, 15:00)
  cron.schedule('0 3,15 * * *', () => {
    syncAnimeList('https://api.jikan.moe/v4/top/anime', { filter: 'bypopularity' }, 50, 'Popular Anime Sync');
  });

  // Seasonal Anime Sync: every 12 hours (06:00, 18:00)
  cron.schedule('0 6,18 * * *', () => {
    syncAnimeList('https://api.jikan.moe/v4/seasons/now', {}, 50, 'Seasonal Anime Sync');
  });

  // Award Winning Anime Sync: every 12 hours (09:00, 21:00)
  cron.schedule('0 9,21 * * *', () => {
    syncAnimeList('https://api.jikan.moe/v4/anime', { genres: 46 }, 50, 'Award Winning Anime Sync');
  });

  console.log('[Cron] Background sync jobs successfully scheduled.');
};
