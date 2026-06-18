import { Router } from 'express';
import { searchAnime, searchSuggestions } from '../Controller/search.controller.js';

const router = Router();

// GET /api/search?q=naruto&genre=Action&sort=score&page=1&limit=24
router.get('/', searchAnime);

// GET /api/search/suggestions?q=naru  (lightweight dropdown hints)
router.get('/suggestions', searchSuggestions);

export default router;
