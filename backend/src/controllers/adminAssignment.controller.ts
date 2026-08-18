import type { RequestHandler } from 'express';
import { addAssignments, listAssignmentRows, removeAssignment } from '../services/adminAssignment.service.js';
import type { CreateAssignmentsBody, DeleteAssignmentQuery } from '../types/adminAssignment.schema.js';

export const getAdminAssignments: RequestHandler = async (_req, res, next) => {
  try {
    const assignments = await listAssignmentRows();
    res.status(200).json({ assignments });
  } catch (error) {
    next(error);
  }
};

export const postAdminAssignments: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateAssignmentsBody;
    const assignment = await addAssignments(body);
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminAssignment: RequestHandler = async (req, res, next) => {
  try {
    const { taskId, userId } = req.query as DeleteAssignmentQuery;
    await removeAssignment(taskId, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
