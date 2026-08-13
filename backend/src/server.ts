import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console -- structured logger arrives in the request-pipeline feature
  console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
});
