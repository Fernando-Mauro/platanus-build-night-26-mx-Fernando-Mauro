// Submission persistence + idempotent mastery apply (T022/T025).
// The only Prisma caller for submissions/mastery writes. The engine math lives
// in features/knowledge (pure); this module just persists it exactly once,
// guarded by submissions.evidence_applied_at (FR-005/014/017).
import "server-only";
import { prisma } from "./client";
import type { MasteryDelta } from "@/features/knowledge/update";

export type CreateSubmissionInput = {
  userId: number;
  problemId: number;
  languageId: number;
  sourceCode: string;
  verdict: string;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
};

export async function nextAttemptNumber(userId: number, problemId: number): Promise<number> {
  const prior = await prisma.submission.count({ where: { userId, problemId } });
  return prior + 1;
}

export async function createSubmission(input: CreateSubmissionInput) {
  return prisma.submission.create({
    data: {
      userId: input.userId,
      problemId: input.problemId,
      languageId: input.languageId,
      sourceCode: input.sourceCode,
      verdict: input.verdict,
      passedCount: input.passedCount,
      totalCount: input.totalCount,
      runtimeMs: input.runtimeMs,
      attemptNumber: await nextAttemptNumber(input.userId, input.problemId),
    },
  });
}

/**
 * Apply mastery deltas for a submission exactly once. Re-checks the idempotency
 * guard inside the transaction so concurrent calls can't double-apply (FR-005).
 * Returns whether the write actually happened (false = already applied / no-op).
 */
export async function applyMasteryDeltas(opts: {
  submissionId: number;
  userId: number;
  deltas: MasteryDelta[];
}): Promise<boolean> {
  const { submissionId, userId, deltas } = opts;
  if (deltas.length === 0) return false;

  return prisma.$transaction(async (tx) => {
    const sub = await tx.submission.findUnique({
      where: { id: submissionId },
      select: { evidenceAppliedAt: true },
    });
    if (!sub || sub.evidenceAppliedAt) return false; // already applied → idempotent no-op

    for (const d of deltas) {
      await tx.conceptMastery.updateMany({
        where: { userId, competencyId: d.competencyId },
        data: { pMastery: d.after, lastSubmissionId: submissionId },
      });
    }
    await tx.submission.update({
      where: { id: submissionId },
      data: { evidenceAppliedAt: new Date() },
    });
    return true;
  });
}
