import logger from '@config/logger.js';
import app from './app.js';
import { env } from '@config/env.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(
    `Server started at http://localhost:${PORT} in ${env.NODE_ENV} mode`
  );
});
