import type { RequestHandler } from 'express';
import { changeUserRole, createUser, resetUserPassword, setUserActive } from '../services/adminUser.service.js';
import type { ChangeRoleBody, CreateUserBody, SetUserActiveBody, UserIdParam } from '../types/adminUser.schema.js';

export const postAdminUser: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateUserBody;
    const result = await createUser(body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const patchAdminUserResetPassword: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params as UserIdParam;
    const result = await resetUserPassword(id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const patchAdminUserRole: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params as UserIdParam;
    const { role } = req.body as ChangeRoleBody;
    const user = await changeUserRole(id, role);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

export const patchAdminUserStatus: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params as UserIdParam;
    const { isActive } = req.body as SetUserActiveBody;
    const user = await setUserActive(id, isActive);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
