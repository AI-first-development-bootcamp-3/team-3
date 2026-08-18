import type { RequestHandler } from 'express';
import { createTask, listTasks, updateTask } from '../services/adminTask.service.js';
import type { CreateTaskBody, TaskIdParam, UpdateTaskBody } from '../types/adminTask.schema.js';

export const getAdminTasks: RequestHandler = async (_req, res, next) => {
  try {
    const tasks = await listTasks();
    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};

export const postAdminTask: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateTaskBody;
    const task = await createTask(body);
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

export const patchAdminTask: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params as TaskIdParam;
    const body = req.body as UpdateTaskBody;
    const task = await updateTask(id, body);
    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};
