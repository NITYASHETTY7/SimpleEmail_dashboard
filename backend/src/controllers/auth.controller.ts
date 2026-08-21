import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  public static async googleLogin(req: Request, res: Response) {
    try {
      const { credential, idToken } = req.body;
      const tokenToVerify = credential || idToken;

      if (!tokenToVerify) {
        return res.status(400).json({ success: false, message: 'Google credential or idToken is required' });
      }

      const result = await AuthService.authenticateWithGoogle(tokenToVerify);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Google authentication failed',
      });
    }
  }

  public static async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      return res.json({
        success: true,
        data: req.user,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
