import express from 'express';
import multer from 'multer';
import {
  uploadResume,
  getResume,
  deleteResume
} from '../controllers/resumeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Upload resume (with PDF file)
router.post('/parse', authMiddleware, upload.single('resume'), uploadResume);

// Get resume
router.get('/', authMiddleware, getResume);

// Delete resume
router.delete('/', authMiddleware, deleteResume);

export default router;