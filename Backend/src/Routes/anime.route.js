import {Router} from 'express';
import { setAnime, getAnime, getByCategory, getAnimeDetail } from '../Controller/anime.controller.js';

const router = Router();

router.route("/set").get(setAnime);
router.route("/get").post(getAnime);
router.route("/get-by-category").post(getByCategory);
router.route("/:malId").get((req, res, next) => {
    if (/^\d+$/.test(req.params.malId)) {
        return getAnimeDetail(req, res, next);
    }
    req.params.category = req.params.malId;
    return getByCategory(req, res, next);
});

export default router;

