import { Request, Response, NextFunction } from 'express';

export const error = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).send({ message: 'Internal Server Error' });
  next(error);
};
