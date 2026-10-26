/**
 * multiAgentService.js
 * Orchestration layer — coordinates the specialist agents but does no AI work itself.
 *
 * Pipeline per candidate:
 *   Step 1: Fetch job + resume text in parallel (Promise.all)
 *   Step 2: ResumeAnalystAgent    — extract structured candidate profile
 *   Step 3: JobMatcherAgent       — score fit, find skill gaps
 *   Step 4: InterviewPlannerAgent — generate targeted questions
 *
 * Bulk screening (/agent/screen-all):
 *   Semantic search → top N candidates → run pipeline on all in parallel → ranked shortlist
 */

const { toolImplementations } = require('../helpers/agentHelper');
const { runResumeAnalystAgent } = require('../agents/resumeAnalystAgent');
const { runJobMatcherAgent } = require('../agents/jobMatcherAgent');
const { runInterviewPlannerAgent } = require('../agents/interviewPlannerAgent');

/**
 * Run the full multi-agent pipeline for a single candidate against a job.
 * @param {string} jobId
 * @param {string} resumeId
 * @returns {object} Full analysis result with agentTrace
 */
async function runCandidatePipeline(jobId, resumeId) {
    if (!jobId) return { success: false, message: 'jobId is required' };
    if (!resumeId) return { success: false, message: 'resumeId is required' };

    console.log(`[MultiAgentService] Starting pipeline — Job: ${jobId} | Resume: ${resumeId}`);

    // Step 1: Fetch job details and resume text in parallel
    const [jobResult, resumeResult] = await Promise.all([
        toolImplementations.getJob({ jobId }),
        toolImplementations.getResumeText({ resumeId })
    ]);

    if (!jobResult.success) {
        return { success: false, message: 'Job not found: ' + jobResult.message };
    }
    if (!resumeResult.success) {
        return { success: false, message: 'Resume not found: ' + resumeResult.message };
    }

    const jobDetails = jobResult.data;
    const resumeText = resumeResult.data.text;

    // Step 2: ResumeAnalystAgent — extract candidate profile
    const resumeAnalysis = await runResumeAnalystAgent(resumeText);
    if (!resumeAnalysis.success) {
        return { success: false, message: 'Resume analysis failed: ' + resumeAnalysis.message };
    }

    // Step 3: JobMatcherAgent — score the match
    const matchResult = await runJobMatcherAgent(resumeAnalysis.data, jobDetails);
    if (!matchResult.success) {
        return { success: false, message: 'Job matching failed: ' + matchResult.message };
    }

    // Step 4: InterviewPlannerAgent — generate targeted questions
    const interviewPlan = await runInterviewPlannerAgent(resumeAnalysis.data, matchResult.data, jobDetails);
    if (!interviewPlan.success) {
        return { success: false, message: 'Interview planning failed: ' + interviewPlan.message };
    }

    const totalTokens = resumeAnalysis.tokensUsed + matchResult.tokensUsed + interviewPlan.tokensUsed;

    console.log(`[MultiAgentService] Pipeline complete. Total tokens: ${totalTokens}`);

    return {
        success: true,
        pipeline: 'multi-agent',
        result: {
            candidate: {
                resumeId: resumeId,
                name: resumeAnalysis.data.candidateName,
                currentRole: resumeAnalysis.data.currentRole,
                experienceYears: resumeAnalysis.data.totalExperienceYears,
                skills: resumeAnalysis.data.skills,
                strengths: resumeAnalysis.data.strengths,
                redFlags: resumeAnalysis.data.redFlags
            },
            matchReport: {
                jobId: jobId,
                jobTitle: jobDetails.title,
                company: jobDetails.company,
                matchScore: matchResult.data.matchScore,
                matchLevel: matchResult.data.matchLevel,
                recommendation: matchResult.data.recommendation,
                matchedSkills: matchResult.data.matchedSkills,
                missingSkills: matchResult.data.missingSkills,
                experienceGap: matchResult.data.experienceGap,
                reasonSummary: matchResult.data.reasonSummary
            },
            interviewPlan: {
                interviewFocus: interviewPlan.data.interviewFocus,
                technicalQuestions: interviewPlan.data.technicalQuestions,
                behavioralQuestions: interviewPlan.data.behavioralQuestions,
                gapProbeQuestions: interviewPlan.data.gapProbeQuestions
            }
        },
        agentTrace: [
            { agent: 'ResumeAnalyst', tokensUsed: resumeAnalysis.tokensUsed },
            { agent: 'JobMatcher', tokensUsed: matchResult.tokensUsed },
            { agent: 'InterviewPlanner', tokensUsed: interviewPlan.tokensUsed },
            { agent: 'Total', tokensUsed: totalTokens }
        ]
    };
}

/**
 * Screen all top candidates for a job automatically.
 * Uses semantic search to find top candidates, then runs the multi-agent
 * pipeline on all of them in parallel.
 *
 * @param {string} jobId
 * @param {number} topK  Number of candidates to screen (default 5, max 10)
 * @returns {object} Ranked shortlist with full analysis per candidate
 */
async function runBulkScreening(jobId, topK = 5) {
    if (!jobId) return { success: false, message: 'jobId is required' };

    const k = Math.min(topK, 10);
    console.log(`[MultiAgentService] Bulk screening — Job: ${jobId} | Top ${k} candidates`);

    // Step 1: Semantic search — find top matching candidates
    const searchResult = await toolImplementations.searchCandidates({ jobId, topK: k });
    if (!searchResult.success) {
        return { success: false, message: 'Candidate search failed: ' + searchResult.message };
    }

    const candidates = searchResult.data;
    if (!candidates || candidates.length === 0) {
        return { success: false, message: 'No candidates found for this job. Ensure resumes have been uploaded and embeddings stored.' };
    }

    console.log(`[Orchestrator] Found ${candidates.length} candidates via semantic search. Running parallel pipeline...`);

    // Step 2: Run multi-agent pipeline on all candidates in parallel
    const pipelineResults = await Promise.all(
        candidates.map(async (candidate, index) => {
            try {
                const result = await runCandidatePipeline(jobId, candidate.resumeId);
                return { ...result, semanticScore: candidate.score, rank: index + 1 };
            } catch (err) {
                console.error(`[Orchestrator] Pipeline failed for resume ${candidate.resumeId}:`, err.message);
                return {
                    success: false,
                    resumeId: candidate.resumeId,
                    message: err.message
                };
            }
        })
    );

    // Step 3: Filter successful results and sort by matchScore descending
    const successful = pipelineResults
        .filter(r => r.success)
        .sort((a, b) => b.result.matchReport.matchScore - a.result.matchReport.matchScore)
        .map((r, index) => ({ ...r, rank: index + 1 }));

    const failed = pipelineResults.filter(r => !r.success);

    const totalTokens = successful.reduce((sum, r) => {
        const trace = r.agentTrace.find(t => t.agent === 'Total');
        return sum + (trace ? trace.tokensUsed : 0);
    }, 0);

    console.log(`[MultiAgentService] Bulk screening complete. ${successful.length} screened, ${failed.length} failed. Total tokens: ${totalTokens}`);

    return {
        success: true,
        pipeline: 'bulk-multi-agent',
        jobId: jobId,
        totalCandidatesFound: candidates.length,
        totalScreened: successful.length,
        totalFailed: failed.length,
        totalTokensUsed: totalTokens,
        shortlist: successful.map(r => ({
            rank: r.rank,
            semanticScore: r.semanticScore,
            candidate: r.result.candidate,
            matchReport: r.result.matchReport,
            interviewPlan: r.result.interviewPlan,
            agentTrace: r.agentTrace
        })),
        errors: failed.length > 0 ? failed.map(f => ({ resumeId: f.resumeId, error: f.message })) : undefined
    };
}

module.exports = { runCandidatePipeline, runBulkScreening };
