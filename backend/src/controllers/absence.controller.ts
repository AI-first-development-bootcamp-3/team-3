import type { RequestHandler } from 'express';
import { createAbsence } from '../services/absence.service.js';
import { AppError } from '../types/errors.js';
import type { CreateAbsenceBody } from '../types/absence.schema.js';

export const postAbsence: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const body = req.body as CreateAbsenceBody;
    const absence = await createAbsence(req.user.sub, body);
    res.status(201).json(absence);
  } catch (error) {
    next(error);
  }
};