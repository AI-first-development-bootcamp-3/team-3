import type { RequestHandler } from 'express';
import {
  createTimeReport,
  createTimeReportBatch,
  listReportingOptions,
  listTimeReportsForMonth,
} from '../services/timeReport.service.js';
import { AppError } from '../types/errors.js';
import type {
  CreateTimeReportBatchBody,
  CreateTimeReportBody,
  ListTimeReportsQuery,
} from '../types/timeReport.schema.js';

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

export const postTimeReportBatch: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const body = req.body as CreateTimeReportBatchBody;
    const reports = await createTimeReportBatch(req.user.sub, body);
    res.status(201).json({ reports });
  } catch (error) {
    next(error);
  }
};

export const getMyTimeReports: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    // `validate` replaced req.query wholesale with the schema's parsed output,
    // so these are already coerced numbers — but Express still types the
    // property as ParsedQs, which shares no members with the parsed shape.
    const { month, year } = req.query as unknown as ListTimeReportsQuery;
    const reports = await listTimeReportsForMonth(req.user.sub, month, year);
    res.status(200).json({ reports });
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
