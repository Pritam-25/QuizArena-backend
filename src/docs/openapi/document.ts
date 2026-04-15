import { generateOpenApi } from '@ts-rest/open-api';
import { env } from '@config/env.js';
import { apiContract } from '@contracts/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import { ERROR_CODES } from '@shared/utils/errors/errorCodes.js';
import { ERROR_MESSAGES } from '@shared/utils/errors/errorMessages.js';

const setJsonRequestExample = (
  document: any,
  path: string,
  method: 'post' | 'patch' | 'put',
  example: Record<string, unknown> | Array<Record<string, unknown>>
) => {
  const requestBody =
    document.paths?.[path]?.[method]?.requestBody?.content?.[
      'application/json'
    ];
  if (!requestBody) return;

  requestBody.example = example;
  if (requestBody.schema) {
    requestBody.schema.example = example;
  }
};

const setJsonResponseExample = (
  document: any,
  path: string,
  method: 'post' | 'patch' | 'put' | 'get' | 'delete',
  statusCode: number,
  example: Record<string, unknown>,
  description?: string
) => {
  const response =
    document.paths?.[path]?.[method]?.responses?.[String(statusCode)];
  const jsonContent = response?.content?.['application/json'];
  if (!jsonContent) return;

  if (description) {
    response.description = description;
  }
  jsonContent.example = example;
  if (jsonContent.schema) {
    jsonContent.schema.example = example;
  }
};

const buildErrorExample = (
  status: number,
  errorCode: (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
) => ({
  success: false,
  error: {
    statusCode: status,
    errorCode,
    message: ERROR_MESSAGES[errorCode],
  },
  meta: {},
});

const buildErrorDescription = (
  status: number,
  errorCode: (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
) => `${status} ${ERROR_MESSAGES[errorCode]}`;

const attachRequestExamples = (document: any) => {
  setJsonRequestExample(document, '/api/v1/auth/register', 'post', {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
  });

  setJsonRequestExample(document, '/api/v1/auth/login', 'post', {
    email: 'john@example.com',
    password: 'password123',
  });

  setJsonRequestExample(document, '/api/v1/users', 'post', {
    username: 'guest_player',
  });

  setJsonRequestExample(document, '/api/v1/quizzes', 'post', {
    title: 'General Knowledge Quiz',
    description: 'A mixed quiz for all players',
    isPublished: false,
  });

  setJsonRequestExample(
    document,
    '/api/v1/quizzes/{quizId}/questions',
    'post',
    {
      questionText: 'What is the capital of France?',
      type: 'MCQ',
      timeLimit: 30,
      points: 1,
      prevOrder: 'a',
      nextOrder: 'c',
    }
  );

  setJsonRequestExample(
    document,
    '/api/v1/quizzes/questions/{questionId}/options',
    'post',
    [
      { optionText: 'Paris', isCorrect: true },
      { optionText: 'Berlin', isCorrect: false },
      { optionText: 'Madrid', isCorrect: false },
    ]
  );

  setJsonRequestExample(
    document,
    '/api/v1/quizzes/{quizId}/questions/{questionId}/reorder',
    'patch',
    {
      prevReorderToken: 'a',
      nextReorderToken: 'c',
    }
  );

  setJsonRequestExample(document, '/api/v1/sessions', 'post', {
    quizId: '11111111-1111-1111-1111-111111111111',
  });

  setJsonRequestExample(document, '/api/v1/sessions/join', 'post', {
    joinCode: '11111111-1111-1111-1111-111111111111',
    nickname: 'PlayerOne',
  });
};

const attachResponseExamples = (document: any) => {
  const attachMappedError = (
    path: string,
    method: 'post' | 'patch' | 'put' | 'get' | 'delete',
    status: number,
    errorCode: (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
  ) => {
    setJsonResponseExample(
      document,
      path,
      method,
      status,
      buildErrorExample(status, errorCode),
      buildErrorDescription(status, errorCode)
    );
  };

  setJsonResponseExample(
    document,
    '/api/v1/auth/register',
    'post',
    201,
    {
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'john_doe',
          email: 'john@example.com',
        },
      },
      meta: {},
    },
    'User registered successfully'
  );

  setJsonResponseExample(
    document,
    '/api/v1/auth/register',
    'post',
    statusCode.conflict,
    buildErrorExample(statusCode.conflict, ERROR_CODES.USER_ALREADY_EXISTS),
    buildErrorDescription(statusCode.conflict, ERROR_CODES.USER_ALREADY_EXISTS)
  );

  attachMappedError(
    '/api/v1/auth/login',
    'post',
    statusCode.unauthorized,
    ERROR_CODES.INVALID_CREDENTIALS
  );
  attachMappedError(
    '/api/v1/auth/me',
    'get',
    statusCode.unauthorized,
    ERROR_CODES.UNAUTHORIZED
  );
  attachMappedError(
    '/api/v1/quizzes',
    'post',
    statusCode.unauthorized,
    ERROR_CODES.UNAUTHORIZED
  );
  attachMappedError(
    '/api/v1/quizzes/{id}',
    'get',
    statusCode.notFound,
    ERROR_CODES.QUIZ_NOT_FOUND
  );
  attachMappedError(
    '/api/v1/quizzes/{quizId}/questions',
    'post',
    statusCode.unauthorized,
    ERROR_CODES.UNAUTHORIZED
  );
  attachMappedError(
    '/api/v1/sessions/{sessionId}',
    'get',
    statusCode.notFound,
    ERROR_CODES.SESSION_NOT_FOUND
  );
};

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
        url: env.PUBLIC_URL ?? env.BASE_URL ?? '/',
      },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth_token',
        },
      },
    },
  });

  document.security = [{ sessionCookie: [] }];
  attachRequestExamples(document);
  attachResponseExamples(document);

  return document;
};
