import type { RequestHandler } from 'express';
import { createClient, listClients, updateClient } from '../services/adminClient.service.js';
import type { ClientIdParam, CreateClientBody, UpdateClientBody } from '../types/adminClient.schema.js';

export const getAdminClients: RequestHandler = async (_req, res, next) => {
  try {
    const clients = await listClients();
    res.status(200).json({ clients });
  } catch (error) {
    next(error);
  }
};

export const postAdminClient: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateClientBody;
    const client = await createClient(body);
    res.status(201).json({ client });
  } catch (error) {
    next(error);
  }
};

export const patchAdminClient: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params as ClientIdParam;
    const body = req.body as UpdateClientBody;
    const client = await updateClient(id, body);
    res.status(200).json({ client });
  } catch (error) {
    next(error);
  }
};
