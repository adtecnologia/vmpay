import { Request, Response, NextFunction } from 'express';
import { API_KEY } from '../config';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

export const apiKeyAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['api-key'] as string | undefined;

  if (!apiKey) {
    res.status(401).json({
      error: 'API Key não informada'
    });
    return;
  }

  if (apiKey !== API_KEY) {
    res.status(403).json({
      error: 'API Key não autorizada'
    });
    return;
  }

  req.apiKey = apiKey;
  next();
};
