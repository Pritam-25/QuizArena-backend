import type { Prisma } from '@generated/prisma/client.js';
import { prisma } from '@infrastructure/database/prismaClient.js';

export class SessionRepository {
  /**
   * Creates a new session.
   * @param data - Prisma SessionUncheckedCreateInput (includes quizId, userId)
   * @returns The created Session record
   */
  async createSession(data: Prisma.SessionUncheckedCreateInput) {
    return prisma.session.create({
      data,
    });
  }

  /**
   * Deletes a session by ID.
   * @param sessionId - The ID of the session to delete
   * @returns The deleted Session record
   */
  async deleteSession(sessionId: string) {
    return await prisma.session.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Finds a session by its Join Code.
   * @param joinCode - The Join Code of the session to find
   * @returns The Session record if found, otherwise null
   */
  async findSessionByJoinCode(joinCode: string) {
    return await prisma.session.findUnique({
      where: { joinCode },
      include: {
        quiz: {
          include: {
            questions: {
              include: { options: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Finds a session by its ID.
   * @param id - The ID of the session to find
   * @returns The Session record if found, otherwise null
   * */
  async findSessionById(sessionId: string) {
    return await prisma.session.findUnique({
      where: { id: sessionId },
    });
  }

  /**
   * Adds a participant to a session.
   * @param sessionId - The target session ID
   * @param nickname - Participant nickname
   * @returns The created participant record
   */
  async addParticipant(sessionId: string, nickname: string) {
    return await prisma.participant.create({
      data: {
        sessionId,
        nickname,
      },
    });
  }

  /**
   * Deletes a participant by ID.
   * @param participantId - The participant ID to delete
   * @returns The deleted participant record
   */
  async deleteParticipant(participantId: string) {
    return await prisma.participant.delete({
      where: { id: participantId },
    });
  }

  /**
   * Updates the status of a session.
   * @param sessionId - The ID of the session to update
   * @param data - Session update payload
   * @return The updated Session record
   */
  async updateSessionStatus(
    sessionId: string,
    data: Prisma.SessionUncheckedUpdateInput
  ) {
    return await prisma.session.update({
      where: { id: sessionId },
      data,
    });
  }
}
