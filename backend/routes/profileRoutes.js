import express from 'express';
import {
  getProfile,
  saveProfile,
  deleteProfile,
  getProfileStatus
} from '../controllers/profileController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user profile
router.get('/', getProfile);

// Save/update user profile
router.post('/', saveProfile);

// Delete user profile
router.delete('/', deleteProfile);

// Get profile completion status
router.get('/status', getProfileStatus);

export default router;