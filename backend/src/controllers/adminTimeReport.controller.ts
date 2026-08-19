import type { RequestHandler } from 'express';
import {
  deleteAdminEmployeeReports,
  listAdminEmployeeReportAudits,
  listAdminEmployeeReports,
  listAdminReportingOptions,
  replaceAdminEmployeeReports,
} from '../services/adminTimeReport.service.js';
import { AppError } from '../types/errors.js';
import type {
  AdminDeleteEmployeeReportsQuery,
  AdminEmployeeReportsQuery,
  AdminReportingOptionsQuery,
  AdminReplaceEmployeeReportsBody,
} from '../types/adminTimeReport.schema.js';

export const getAdminEmployeeReports: RequestHandler = async (req, res, next) => {
  try {
    const { userId, month, year } = req.query as unknown as AdminEmployeeReportsQuery;
    const reports = await listAdminEmployeeReports(userId, month, year);
    res.status(200).json({ reports });
  } catch (error) {
    next(error);
  }
};

export const getAdminReportingOptions: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.query as unknown as AdminReportingOptionsQuery;
    const options = await listAdminReportingOptions(userId);
    res.status(200).json(options);
  } catch (error) {
    next(error);
  }
};

export const getAdminEmployeeReportAudits: RequestHandler = async (req, res, next) => {
  try {
    const { userId, month, year } = req.query as unknown as AdminEmployeeReportsQuery;
    const audits = await listAdminEmployeeReportAudits(userId, month, year);
    res.status(200).json({ audits });
  } catch (error) {
    next(error);
  }
};

export const postAdminEmployeeReportsBatch: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const { userId, reason, ...input } = req.body as AdminReplaceEmployeeReportsBody;
    const reports = await replaceAdminEmployeeReports(req.user.sub, userId, input, reason);
    res.status(201).json({ reports });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminEmployeeReportsForDate: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const { userId, date, reason } = req.query as unknown as AdminDeleteEmployeeReportsQuery;
    await deleteAdminEmployeeReports(req.user.sub, userId, date, reason);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
