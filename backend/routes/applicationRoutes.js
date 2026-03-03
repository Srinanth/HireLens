import express from 'express';
import { applyToJob, updateApplicationStatus } from '../controllers/applicationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/', authMiddleware, applyToJob);
router.put('/status', authMiddleware, updateApplicationStatus);

export default router;