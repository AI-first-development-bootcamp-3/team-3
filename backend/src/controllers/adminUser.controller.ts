import type { RequestHandler } from 'express';
import { createUser } from '../services/adminUser.service.js';
import type { CreateUserBody } from '../types/adminUser.schema.js';

export const postAdminUser: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateUserBody;
    const result = await createUser(body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
