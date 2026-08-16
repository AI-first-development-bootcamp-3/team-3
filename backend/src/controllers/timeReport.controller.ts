import type { RequestHandler } from 'express';
import { createTimeReport, listReportingOptions } from '../services/timeReport.service.js';
import { AppError } from '../types/errors.js';
import type { CreateTimeReportBody } from '../types/timeReport.schema.js';

export const postTimeReport: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const body = req.body as CreateTimeReportBody;
    const report = await createTimeReport(req.user.sub, body);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

export const getMyReportingOptions: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const options = await listReportingOptions();
    res.status(200).json(options);
  } catch (error) {
    next(error);
  }
};
