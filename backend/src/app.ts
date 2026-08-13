import express from 'express';

/**
 * The Express app, fully configured but never listening. Kept separate from
 * server.ts so tests can exercise it directly (e.g. with supertest) without
 * binding a real port.
 */
export const app = express();

app.use(express.json());
