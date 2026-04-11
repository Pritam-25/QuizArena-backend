import { QuizRepository } from './quiz.repository.js';
import { QuizService } from './quiz.service.js';
import { QuizController } from './quiz.controller.js';

/**
 * Creates and wires quiz module dependencies.
 * @returns Quiz controller, service, and repository instances
 */
export function createQuizModule() {
  const repo = new QuizRepository();
  const service = new QuizService(repo);
  const controller = new QuizController(service);

  return { controller, service, repo };
}
