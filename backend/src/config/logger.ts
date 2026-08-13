import pino from 'pino';
import { env } from './env.js';

/**
 * Singleton logger. Pretty-printed in development for readability; structured
 * JSON everywhere else (including test, where LOG_LEVEL=silent mutes it).
 */
export const logger =
  env.NODE_ENV === 'development'
    ? pino({
        level: env.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      })
    : pino({ level: env.LOG_LEVEL });
