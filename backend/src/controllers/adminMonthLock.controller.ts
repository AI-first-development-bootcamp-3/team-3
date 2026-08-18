import type { RequestHandler } from 'express';
import { listMonthLocks, lockMonth, unlockMonth } from '../services/monthLock.service.js';
import { AppError } from '../types/errors.js';
import type { ListMonthLocksQuery, LockMonthBody, MonthLockParam } from '../types/adminMonthLock.schema.js';

export const getAdminMonthLocks: RequestHandler = async (req, res, next) => {
  try {
    const { year } = req.query as unknown as ListMonthLocksQuery;
    const locks = await listMonthLocks(year);
    res.status(200).json({ locks });
  } catch (error) {
    next(error);
  }
};

export const postAdminMonthLock: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const { year, month } = req.body as LockMonthBody;
    const lock = await lockMonth(year, month, req.user.sub);
    res.status(201).json({ lock });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminMonthLock: RequestHandler = async (req, res, next) => {
  try {
    const { year, month } = req.params as unknown as MonthLockParam;
    await unlockMonth(year, month);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
