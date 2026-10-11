const genAI = require('../config/gemini');
const { toolDefinitions, toolImplementations } = require('../helpers/agentTools');

const MAX_ITERATIONS = 10;
const AGENT_TIMEOUT_MS = 60000; // 60 seconds max
const MAX_RETRIES = 3;

// ─── Retry with exponential backoff ───────────────────────────────────────────
async function callWithRetry(fn, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const isRetryable = err.message?.includes('503') || 
                                err.message?.includes('overloaded') ||
                                err.message?.includes('UNAVAILABLE');

            if (!isRetryable || attempt === retries) {
                throw err;
            }

            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.warn(`[Agent] Gemini unavailable. Retry ${attempt}/${retries} in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

// ─── Main agent function ───────────────────────────────────────────────────────
async function runScreeningAgent(userMessage) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const startTime = Date.now();

    console.log('[Agent] Starting screening agent');
    console.log('[Agent] User message:', userMessage);
    console.log('[Agent] Using model:', modelName);

    // Input validation
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length < 10) {
        return { success: false, answer: 'Please provide a valid message (minimum 10 characters).', iterations: 0 };
    }

    const model = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ functionDeclarations: toolDefinitions }],
        systemInstruction: {
            parts: [{
                text: 'You are an AI recruitment screener. You help recruiters find and evaluate candidates for jobs. Use the available tools to fetch job details, search candidates, and calculate match scores. Always provide a structured final recommendation.'
            }]
        }
    });

    const cache = {};
    let iterations = 0;
    let totalTokensUsed = 0;

    const contents = [
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    while (iterations < MAX_ITERATIONS) {
        // ── Timeout check ──────────────────────────────────────────────────────
        if (Date.now() - startTime > AGENT_TIMEOUT_MS) {
            console.warn('[Agent] Timeout reached after', Date.now() - startTime, 'ms');
            return {
                success: false,
                answer: 'Agent timed out. Please try again with a simpler request.',
                iterations,
                tokensUsed: totalTokensUsed
            };
        }

        iterations++;
        console.log(`[Agent] Iteration ${iterations}/${MAX_ITERATIONS}`);

        // ── Call Gemini with retry ─────────────────────────────────────────────
        const result = await callWithRetry(() => model.generateContent({ contents }));
        const candidate = result.response.candidates[0];

        // ── Token tracking ─────────────────────────────────────────────────────
        const usage = result.response.usageMetadata;
        if (usage) {
            totalTokensUsed += usage.totalTokenCount || 0;
            console.log(`[Agent] Tokens this call — prompt: ${usage.promptTokenCount}, candidates: ${usage.candidatesTokenCount}, total so far: ${totalTokensUsed}`);
        }

        contents.push(candidate.content);

        const parts = candidate.content?.parts || [];
        const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall);

        // ── Final answer ───────────────────────────────────────────────────────
        if (functionCalls.length === 0) {
            const textPart = parts.find(p => p.text);
            const duration = Date.now() - startTime;
            console.log(`[Agent] Final answer received after ${iterations} iterations, ${duration}ms, ${totalTokensUsed} tokens`);
            return {
                success: true,
                answer: textPart ? textPart.text : 'No response generated',
                iterations,
                tokensUsed: totalTokensUsed,
                durationMs: duration
            };
        }

        // ── Parallel tool execution ────────────────────────────────────────────
        console.log(`[Agent] Executing ${functionCalls.length} tool(s) in parallel...`);

        const toolResults = await Promise.all(
            functionCalls.map(async ({ name, args }) => {
                console.log(`[Agent] Tool called: ${name} | args:`, JSON.stringify(args));

                const cacheKey = name + ':' + JSON.stringify(args);

                if (cache[cacheKey]) {
                    console.log(`[Agent] Cache hit: ${name}`);
                    return { name, result: cache[cacheKey] };
                }

                try {
                    if (!toolImplementations[name]) throw new Error('Unknown tool: ' + name);
                    const toolResult = await toolImplementations[name](args);
                    cache[cacheKey] = toolResult;
                    console.log(`[Agent] Tool success: ${name} →`, JSON.stringify(toolResult).substring(0, 300));
                    return { name, result: toolResult };
                } catch (err) {
                    console.error(`[Agent] Tool failed: ${name} →`, err.message);
                    return { name, result: { success: false, message: err.message } };
                }
            })
        );

        // ── Send all tool results back to Gemini ───────────────────────────────
        const functionResponseParts = toolResults.map(({ name, result }) => ({
            functionResponse: {
                name,
                response: { result }
            }
        }));

        console.log(`[Agent] Sending ${functionResponseParts.length} tool result(s) back to Gemini...`);
        contents.push({ role: 'user', parts: functionResponseParts });
    }

    console.warn('[Agent] Max iterations reached');
    return {
        success: false,
        answer: 'Agent reached maximum iterations without a final answer.',
        iterations,
        tokensUsed: totalTokensUsed,
        durationMs: Date.now() - startTime
    };
}

module.exports = { runScreeningAgent };