import { generateOpenApi } from '@ts-rest/open-api';
import { env } from '@config/env.js';
import { apiContract } from '@contracts/index.js';

export const generateOpenApiDocument = (): any => {
  const document = generateOpenApi(apiContract, {
    info: {
      title: 'Live Quiz Arena API',
      version: '1.0.0',
      description:
        'Versioned backend contract for auth, user, quiz, and session',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  });

  document.security = [{ bearerAuth: [] }];

  return document;
};
