import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';

describe('POST /sample/echo', () => {
  it('passes through a valid body, stripping unknown fields', async () => {
    const response = await request(app)
      .post('/sample/echo')
      .send({ name: 'Dana', age: 30, extra: 'strip me' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: { name: 'Dana', age: 30 } });
  });

  it('rejects a missing required field', async () => {
    const response = await request(app).post('/sample/echo').send({ age: 30 });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
  });

  it('rejects a wrong-typed field', async () => {
    const response = await request(app).post('/sample/echo').send({ name: 'Dana', age: 'thirty' });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'age' })]),
    );
  });

  it('reports every failing field in one response', async () => {
    const response = await request(app).post('/sample/echo').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'age' }),
      ]),
    );
  });
});
