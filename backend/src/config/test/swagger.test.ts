import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { openApiSpec } from '../swagger.js';

describe('OpenAPI document', () => {
  it('is valid OpenAPI', async () => {
    await expect(SwaggerParser.validate(structuredClone(openApiSpec))).resolves.toBeTruthy();
  });

  it('declares the bearer-token security scheme', () => {
    const spec = openApiSpec as { components?: { securitySchemes?: Record<string, unknown> } };
    expect(spec.components?.securitySchemes?.['bearerAuth']).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer' }),
    );
  });

  it('documents the health endpoint as the worked example, with its 200 and 503 responses', () => {
    const spec = openApiSpec as {
      paths?: Record<string, { get?: { responses?: Record<string, unknown> } }>;
    };
    const responses = spec.paths?.['/health']?.get?.responses;

    expect(responses).toHaveProperty('200');
    expect(responses).toHaveProperty('503');
  });

  it('documents the shared error contract as a reusable schema component', () => {
    const spec = openApiSpec as { components?: { schemas?: Record<string, unknown> } };
    expect(spec.components?.schemas?.['Error']).toBeTruthy();
  });
});

describe('GET /api-docs', () => {
  it('serves the interactive documentation UI', async () => {
    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });

  it('serves the raw OpenAPI document as JSON', async () => {
    const response = await request(app).get('/api-docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toMatch(/^3\./);
  });
});
