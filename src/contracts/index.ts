import { initContract } from '@ts-rest/core';
import { authContract } from './modules/auth.contract.js';
import { userContract } from './modules/user.contract.js';
import { quizContract } from './modules/quiz.contract.js';
import { sessionContract } from './modules/session.contract.js';
import { systemContract } from './modules/system.contract.js';

const c = initContract();

export const apiContract = c.router(
  {
    auth: authContract,
    user: userContract,
    quiz: quizContract,
    session: sessionContract,
    system: systemContract,
  },
  {
    pathPrefix: '/api/v1',
  }
);
