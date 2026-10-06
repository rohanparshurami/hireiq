const genAI = require('../config/gemini');

async function parseResume(fileBuffer, mimeType) {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = `You are a resume parser. Extract the following information from this resume and return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

Return this exact structure:
{
  "name": "full name of the candidate",
  "email": "email address",
  "phone": "phone number",
  "totalExperience": "total years of experience as a string e.g. 6 years",
  "skills": ["skill1", "skill2"],
  "companies": ["company1", "company2"],
  "education": ["degree and institution"]
}

If a field is not found, use null for strings and empty array [] for arrays.`;

    const filePart = {
        inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType
        }
    };

    const result = await model.generateContent([prompt, filePart]);
    const text = result.response.text();

    const parsed = JSON.parse(text);
    return parsed;
}

async function matchJob(parsedResumeData, jobDescription, jobTitle) {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = `You are an expert HR recruiter. Compare the candidate's resume data against the job description and return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Candidate Resume Data:
${JSON.stringify(parsedResumeData, null, 2)}

Return this exact structure:
{
  "matchScore": <number between 0 and 100>,
  "summary": "<2-3 sentence summary of the candidate's fit for this role>",
  "matchedSkills": ["<skills the candidate has that match the job>"],
  "missingSkills": ["<skills required by job that candidate lacks>"],
  "recommendation": "<one of: shortlist, consider, reject>"
}

Scoring guide:
- 80-100: Strong match, shortlist
- 60-79: Partial match, consider
- Below 60: Poor match, reject`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    return parsed;
}

async function getResumeFeedback(parsedResumeData) {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
    
    const prompt = `You are an expert resume coach with 15 years of experience. Review this candidate's resume data and provide detailed, actionable feedback. Return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

Candidate Resume Data:
${JSON.stringify(parsedResumeData, null, 2)}

Return this exact structure:
{
  "overallRating": "<rating out of 10 as string e.g. 7/10>",
  "overallSummary": "<2-3 sentence overall assessment>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "improvements": ["<specific actionable improvement 1>", "<specific actionable improvement 2>"],
  "missingElements": ["<missing section or info 1>", "<missing section or info 2>"],
  "experienceFeedback": "<feedback on experience section>",
  "skillsFeedback": "<feedback on skills listed>"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
}

async function generateInterviewQuestions(jobTitle, jobDescription) {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = `You are an expert HR interviewer. Generate interview questions for the following job. Return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Return this exact structure:
{
  "technical": ["<technical question 1>", "<technical question 2>", "<technical question 3>"],
  "behavioral": ["<behavioral question 1>", "<behavioral question 2>", "<behavioral question 3>"],
  "situational": ["<situational question 1>", "<situational question 2>", "<situational question 3>"],
  "cultural": ["<cultural fit question 1>", "<cultural fit question 2>"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
}

module.exports = { parseResume: parseResume, matchJob: matchJob, getResumeFeedback: getResumeFeedback, generateInterviewQuestions: generateInterviewQuestions };