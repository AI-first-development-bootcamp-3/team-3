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
