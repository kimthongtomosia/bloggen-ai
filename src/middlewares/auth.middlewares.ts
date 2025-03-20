import { NextFunction, Request, Response } from 'express';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  // kiểm tra tính hợp lệ của token
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
  next();
};
