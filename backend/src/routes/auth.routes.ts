import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/google', AuthController.googleLogin);
router.get('/me', authMiddleware, AuthController.getProfile);

export default router;
