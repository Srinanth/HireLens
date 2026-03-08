import express from 'express';
import {
  getGlobalRankings,
  getUserRanking,
  searchRankings
} from '../controllers/rankingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get global rankings (no auth needed)
router.get('/global', getGlobalRankings);


// Search rankings (no auth needed)
router.get('/search', searchRankings);

// Get user's ranking (auth needed)
router.get('/user', authMiddleware, getUserRanking);

export default router;