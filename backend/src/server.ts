import { app } from './app.js';
import { env } from './config/env.js';
import { startWorkClockEodScheduler } from './jobs/workClockEod.job.js';

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  startWorkClockEodScheduler();
});
