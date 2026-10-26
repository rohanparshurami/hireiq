const genAI = require('../config/gemini');
const { withRetry, toolDefinitions, toolImplementations } = require('../helpers/agentHelper');

const MAX_ITERATIONS = 10;
const TIMEOUT_MS = 60000;

// Execute a single tool call with cache
async function executeTool(name, args, cache) {
    const cacheKey = `${name}:${JSON.stringify(args)}`;

    if (cache[cacheKey]) {
        console.log(`[Agent] Cache hit: ${name}`);
        return cache[cacheKey];
    }

    if (!toolImplementations[name]) {
        throw new Error(`Unknown tool: ${name}`);
    }

    console.log(`[Agent] Executing: ${name}`, args);
    const result = await toolImplementations[name](args);
    cache[cacheKey] = result;
    console.log(`[Agent] Done: ${name}`);
    return result;
}

// Main agent function
async function runScreeningAgent(userMessage) {

    // Input validation
    if (!userMessage || userMessage.trim().length < 10) {
        return { success: false, answer: 'Message too short.', iterations: 0 };
    }

    const startTime = Date.now();
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    console.log(`[Agent] Starting | model: ${modelName} | message: ${userMessage}`);

    const model = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ functionDeclarations: toolDefinitions }],
        systemInstruction: {
            parts: [{ text: 'You are an AI recruitment screener. Use tools to fetch job details, search candidates, and calculate match scores. Always give a structured final recommendation.' }]
        }
    });

    const contents = [{ role: 'user', parts: [{ text: userMessage }] }];
    const cache = {};
    let iterations = 0;
    let totalTokens = 0;

    // Calls Gemini with the current conversation history
    async function callGemini() {
        return model.generateContent({ contents });
    }

    // Agentic loop
    while (iterations < MAX_ITERATIONS) {

        // Timeout check
        if (Date.now() - startTime > TIMEOUT_MS) {
            return { success: false, answer: 'Agent timed out.', iterations, tokensUsed: totalTokens };
        }

        iterations++;
        console.log(`[Agent] Iteration ${iterations}/${MAX_ITERATIONS}`);

        // Call Gemini with retry
        const result = await withRetry(callGemini, 3, 'AgentService')();
        const geminiResponse = result.response.candidates[0];

        // Track tokens
        const usage = result.response.usageMetadata;
        if (usage) {
            totalTokens += usage.totalTokenCount || 0;
            console.log(`[Agent] Tokens used so far: ${totalTokens}`);
        }

        // Add Gemini response to conversation history
        contents.push(geminiResponse.content);

        const parts = geminiResponse.content?.parts || [];

        // Extract function calls using forEach
        const functionCalls = [];
        parts.forEach(function(p) {
            if (p.functionCall) {
                functionCalls.push(p.functionCall);
            }
        });

        // No tool calls = Gemini gave final answer
        if (functionCalls.length === 0) {
            let answer = 'No response generated';
            parts.forEach(function(p) {
                if (p.text) {
                    answer = p.text;
                }
            });
            const duration = Date.now() - startTime;
            console.log(`[Agent] Done in ${iterations} iterations, ${duration}ms, ${totalTokens} tokens`);
            return { success: true, answer, iterations, tokensUsed: totalTokens, durationMs: duration };
        }

        // Run all tool calls in parallel
        console.log(`[Agent] Running ${functionCalls.length} tool(s) in parallel`);
        const toolPromises = [];
        functionCalls.forEach(function(functionCall) {
            const promise = executeTool(functionCall.name, functionCall.args, cache)
                .then(function(result) {
                    return { name: functionCall.name, result: result };
                })
                .catch(function(err) {
                    console.error(`[Agent] Tool error: ${functionCall.name} — ${err.message}`);
                    return { name: functionCall.name, result: { success: false, message: err.message } };
                });
            toolPromises.push(promise);
        });

        const toolResults = await Promise.all(toolPromises);

        // Send results back to Gemini
        const responseparts = [];
        toolResults.forEach(function(toolResult) {
            responseparts.push({
                functionResponse: {
                    name: toolResult.name,
                    response: { result: toolResult.result }
                }
            });
        });

        contents.push({ role: 'user', parts: responseparts });
    }

    return { success: false, answer: 'Max iterations reached.', iterations, tokensUsed: totalTokens };
}

module.exports = { runScreeningAgent };