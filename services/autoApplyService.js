const applicationModel = require('../models/applicationModel');
const candidateModel = require('../models/candidateModel');
const savedJobModel = require('../models/savedJobModel');
const { callAI } = require('./aiServiceClient');
const { buildCandidateAIText } = require('../utils/cvTextExtractor');
const { qualifiesForAutoApply } = require('../utils/autoApply');

const MAX_CANDIDATES_PER_JOB = 100;
const MATCH_CONCURRENCY = 4;

async function runWithConcurrency(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        await worker(items[index]);
      }
    }
  );
  await Promise.all(runners);
}

function autoApplyJobText(job) {
  return [job.title, job.description || '', job.requirements || ''].join(' ').trim();
}

async function evaluateNewJobForAutoApply(job) {
  const summary = {
    eligible: 0,
    evaluated: 0,
    applied: 0,
    below_threshold: 0,
    skipped: 0,
    failed: 0
  };
  if (!job || job.status !== 'active') return summary;

  const candidates = await candidateModel.findAutoApplyCandidates(MAX_CANDIDATES_PER_JOB);
  summary.eligible = candidates.length;
  if (!candidates.length) return summary;

  const existingCandidateIds = new Set(await applicationModel.findCandidateIdsByJob(job.id));
  const jobText = autoApplyJobText(job);

  await runWithConcurrency(candidates, MATCH_CONCURRENCY, async (candidate) => {
    if (existingCandidateIds.has(Number(candidate.id))) {
      summary.skipped += 1;
      return;
    }

    try {
      const candidateInput = await buildCandidateAIText(candidate);
      if (candidateInput.text.length < 20) {
        summary.skipped += 1;
        return;
      }

      const match = await callAI('/match', {
        cv_text: candidateInput.text,
        job_text: jobText
      });
      const score = Number(match.score);
      const minimumScore = Number(candidate.auto_apply_min_score || 70);
      summary.evaluated += 1;

      if (!qualifiesForAutoApply(score, minimumScore)) {
        summary.below_threshold += 1;
        return;
      }

      await applicationModel.create({
        jobId: job.id,
        candidateId: candidate.id,
        cvUrl: candidate.cv_url,
        cvFilename: candidate.cv_filename || 'CV hồ sơ',
        cvSource: 'profile',
        applicationSource: 'auto_match',
        coverLetter: 'Đơn được JobLink tự động gửi theo tùy chọn của ứng viên.',
        changedByUserId: null,
        initialNote: `Hệ thống tự động ứng tuyển: điểm phù hợp ${score}% đạt ngưỡng ${minimumScore}% của ứng viên.`,
        aiScore: score,
        aiLabel: match.label || null
      });
      existingCandidateIds.add(Number(candidate.id));
      summary.applied += 1;

      await savedJobModel.unsaveJob(candidate.id, job.id).catch((error) => {
        console.error('autoApply saved-job cleanup warning:', error.message);
      });
    } catch (error) {
      if (error?.code === '23505' || error?.code === 'ER_DUP_ENTRY') {
        summary.skipped += 1;
        return;
      }
      summary.failed += 1;
      console.error(`autoApply candidate ${candidate.id} error:`, error.message);
    }
  });

  return summary;
}

module.exports = {
  MAX_CANDIDATES_PER_JOB,
  MATCH_CONCURRENCY,
  autoApplyJobText,
  evaluateNewJobForAutoApply,
  runWithConcurrency
};
