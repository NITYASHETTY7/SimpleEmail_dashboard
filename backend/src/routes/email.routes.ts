import { Router } from 'express';
import multer from 'multer';
import { EmailController } from '../controllers/email.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

// Apply auth middleware to all email routes
router.use(authMiddleware);

router.post('/schedule', EmailController.scheduleEmail);
router.post('/batch-schedule', EmailController.batchSchedule);
router.post('/parse-leads', upload.single('file'), EmailController.parseLeadsFile);
router.get('/scheduled', EmailController.getScheduledEmails);
router.get('/sent', EmailController.getSentEmails);
router.delete('/scheduled/:id', EmailController.cancelScheduledEmail);
router.delete('/mock-samples', EmailController.deleteMockSamples);
router.delete('/:id', EmailController.deleteEmail);
router.get('/stats', EmailController.getStats);
router.get('/senders', EmailController.getSenders);
router.post('/senders', EmailController.createSender);

export default router;
