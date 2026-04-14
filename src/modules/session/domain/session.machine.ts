export type SessionState = 'WAITING' | 'STARTED' | 'QUESTION' | 'ENDED';

export const transitions: Record<SessionState, SessionState[]> = {
  WAITING: ['STARTED'],
  STARTED: ['QUESTION'],
  QUESTION: ['QUESTION', 'ENDED'],
  ENDED: [],
};

export function canTransition(from: SessionState, to: SessionState) {
  return transitions[from].includes(to);
}
