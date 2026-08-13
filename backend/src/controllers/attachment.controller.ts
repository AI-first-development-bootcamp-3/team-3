import type { RequestHandler } from 'express';
import { retrieveAttachment, uploadAttachment } from '../services/attachment.service.js';
import { AppError } from '../types/errors.js';

export const postAttachment: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!req.file) {
      next(AppError.badRequest('A file is required'));
      return;
    }

    const attachment = await uploadAttachment({
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      content: req.file.buffer,
      uploaderId: req.user.sub,
    });

    res.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
};

export const getAttachment: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const id = req.params['id'];
    if (!id || Array.isArray(id)) {
      next(AppError.badRequest('Attachment id is required'));
      return;
    }

    const { filename, mimeType, stream } = await retrieveAttachment(id, {
      id: req.user.sub,
      role: req.user.role,
    });

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    stream.on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
};
