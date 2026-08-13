import type { RequestHandler } from 'express';
import type { EchoBody } from '../types/sample.schema.js';

/**
 * Echoes back the already-validated, already-stripped body so callers can
 * see exactly what the validation middleware let through.
 */
export const postEcho: RequestHandler = (req, res) => {
  const body = req.body as EchoBody;
  res.status(200).json({ received: body });
};

/**
 * Demonstrates `authenticate` alone: any signed-in caller, regardless of role.
 */
export const getProtected: RequestHandler = (req, res) => {
  res.status(200).json({ user: req.user });
};

/**
 * Demonstrates `authenticate` composed with `requireRole('ADMIN')`.
 */
export const getAdminOnly: RequestHandler = (req, res) => {
  res.status(200).json({ user: req.user });
};
