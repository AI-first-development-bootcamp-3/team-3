import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { prisma, type Prisma } from '../config/prisma.js';
import { clearSessionCookie, setSessionCookie } from '../http/sessionCookie.js';
import { changeOwnPassword, login, logout } from '../services/auth.service.js';
import { AppError } from '../types/errors.js';
import type { ChangePasswordBody, LoginBody } from '../types/auth.schema.js';

export const postLogin: RequestHandler = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body as LoginBody;
    const result = await login(email, password, rememberMe);
    const cookieMaxAge = rememberMe ? env.JWT_REMEMBER_ME_EXPIRES_IN_SECONDS : undefined;
    setSessionCookie(res, result.token, cookieMaxAge);
    res.status(200).json({ expiresAt: result.expiresAt, user: result.user });
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
    clearSessionCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getMe: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const user = await prisma.user.findFirst({
      where: { id: req.user.sub, isActive: undefined } as unknown as Prisma.UserWhereInput,
    });
    if (!user || !user.isActive) {
      next(new AppError(401, 'ACCOUNT_DEACTIVATED', 'Account is no longer active'));
      return;
    }
    res.status(200).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
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
