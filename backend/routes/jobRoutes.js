import express from 'express';
import { getJobs ,searchJobs, applyJob,getAppliedJobs,updateApplicationStatus,removeAppliedJob} from '../controllers/jobController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getJobs);
router.get('/applied', authMiddleware, getAppliedJobs);
router.get('/search', searchJobs);
router.get('/:id', getJobs);

router.post('/apply', authMiddleware, applyJob);

router.patch('/:id/status', authMiddleware, updateApplicationStatus);
router.delete('/:id', authMiddleware, removeAppliedJob);

export default router;