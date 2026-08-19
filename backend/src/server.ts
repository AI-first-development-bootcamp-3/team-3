import { app } from './app.js';
import { env } from './config/env.js';
import { startWorkClockEodScheduler } from './jobs/workClockEod.job.js';
import { syncIsraeliHolidays } from './services/israeliHolidays.service.js';
import { logger } from './config/logger.js';

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  startWorkClockEodScheduler();
  const year = new Date().getFullYear();
  void syncIsraeliHolidays(year).catch((error: unknown) => {
    logger.error({ err: error }, 'Failed to sync Israeli holidays');
  });
  void syncIsraeliHolidays(year + 1).catch((error: unknown) => {
    logger.error({ err: error }, 'Failed to sync Israeli holidays');
  });
});
