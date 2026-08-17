import type { RequestHandler } from 'express';
import { changeOwnPassword, login, logout } from '../services/auth.service.js';
import { AppError } from '../types/errors.js';
import type { ChangePasswordBody, LoginBody } from '../types/auth.schema.js';

export const postLogin: RequestHandler = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body as LoginBody;
    const result = await login(email, password, rememberMe);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const postLogout: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    // Identity comes from the verified token only, never the body - taking
    // an id from the request would let one caller end another account's
    // session (design.md D5).
    await logout(req.user.sub);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const patchMyPassword: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const { newPassword } = req.body as ChangePasswordBody;
    const user = await changeOwnPassword(req.user.sub, newPassword);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};
