import type { RequestHandler } from 'express';
import {
  completeClockSession,
  discardClockSession,
  getClockSession,
  startClockSession,
  stopClockSession,
} from '../services/workClock.service.js';
import { AppError } from '../types/errors.js';

export const getMyClockSession: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const session = await getClockSession(req.user.sub);
    res.status(200).json({ session });
  } catch (error) {
    next(error);
  }
};

export const postClockStart: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const session = await startClockSession(req.user.sub);
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
};

export const postClockStop: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const session = await stopClockSession(req.user.sub);
    res.status(200).json({ session });
  } catch (error) {
    next(error);
  }
};

export const postClockDiscard: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    await discardClockSession(req.user.sub);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const postClockComplete: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    await completeClockSession(req.user.sub);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
