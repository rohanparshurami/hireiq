const genAI = require('../config/gemini');

async function parseResume(fileBuffer, mimeType) {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

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
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

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

module.exports = { parseResume: parseResume, matchJob: matchJob };