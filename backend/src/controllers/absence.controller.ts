import type { RequestHandler } from 'express';
import { createAbsence, deleteAbsence, listAbsencesForMonth } from '../services/absence.service.js';
import { AppError } from '../types/errors.js';
import type { AbsenceIdParam, CreateAbsenceBody, ListAbsencesQuery } from '../types/absence.schema.js';

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

export const getMyAbsences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const { month, year } = req.query as unknown as ListAbsencesQuery;
    const absences = await listAbsencesForMonth(req.user.sub, month, year);
    res.status(200).json({ absences });
  } catch (error) {
    next(error);
  }
};

export const deleteMyAbsence: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const { id } = req.params as AbsenceIdParam;
    await deleteAbsence(req.user.sub, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
