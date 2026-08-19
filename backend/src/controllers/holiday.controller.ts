import type { RequestHandler } from 'express';
import { listStoredHolidays } from '../services/israeliHolidays.service.js';
import { AppError } from '../types/errors.js';
import type { ListHolidaysQuery } from '../types/holiday.schema.js';

export const getHolidays: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const { year } = req.query as unknown as ListHolidaysQuery;
    const holidays = await listStoredHolidays(year);
    res.status(200).json({ holidays });
  } catch (error) {
    next(error);
  }
};
