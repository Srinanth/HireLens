import express from 'express';
import {
  generateRoadmap,
  getUserRoadmaps,
  getRoadmapById,
  updateRoadmapProgress,
  deleteRoadmap
} from '../controllers/roadmapController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Generate roadmap
router.post('/generate', generateRoadmap);

// Get all roadmaps for user
router.get('/', getUserRoadmaps);

// Get single roadmap by ID
router.get('/:id', getRoadmapById);

// Update roadmap progress
router.patch('/:id', updateRoadmapProgress);

// Delete roadmap
router.delete('/:id', deleteRoadmap);

export default router;