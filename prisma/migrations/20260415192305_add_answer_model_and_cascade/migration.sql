-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_hostId_fkey";

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT,
    "answerText" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "scoreEarned" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Answer_participantId_questionId_key" ON "Answer"("participantId", "questionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;
