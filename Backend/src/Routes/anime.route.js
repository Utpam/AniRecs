import {Router} from 'express';
import { setAnime, getAnime, getByCategory } from '../Controller/anime.controller.js';

const router = Router();

router.route("/set").get(setAnime);
router.route("/get").post(getAnime);
router.route("/get-by-category").post(getByCategory);
router.route("/:category").get(getByCategory);

export default router;

