import type { RequestHandler } from 'express';
import { createProject, listProjects, updateProject } from '../services/adminProject.service.js';
import type { CreateProjectBody, ProjectIdParam, UpdateProjectBody } from '../types/adminProject.schema.js';

export const getAdminProjects: RequestHandler = async (_req, res, next) => {
  try {
    const projects = await listProjects();
    res.status(200).json({ projects });
  } catch (error) {
    next(error);
  }
};

export const postAdminProject: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateProjectBody;
    const project = await createProject(body);
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
};

export const patchAdminProject: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params as ProjectIdParam;
    const body = req.body as UpdateProjectBody;
    const project = await updateProject(id, body);
    res.status(200).json({ project });
  } catch (error) {
    next(error);
  }
};
