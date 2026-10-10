const genAI = require('../config/gemini');
const { toolDefinitions, toolImplementations } = require('../helpers/agentTools');

const MAX_ITERATIONS = 10;

async function runScreeningAgent(userMessage) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    
    console.log('[Agent] Starting screening agent');
    console.log('[Agent] User message:', userMessage);
    console.log('[Agent] Using model:', modelName);

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

    // Maintain conversation history manually with valid roles: 'user' and 'model'
    const contents = [
        {
            role: 'user',
            parts: [{ text: userMessage }]
        }
    ];

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`[Agent] Iteration ${iterations}/${MAX_ITERATIONS}`);

        const result = await model.generateContent({ contents });
        const candidate = result.response.candidates[0];
        console.log('[Agent] Raw Gemini response:', JSON.stringify(candidate, null, 2));

        // Append the model's turn to history
        contents.push(candidate.content);

        const parts = candidate.content?.parts || [];
        const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall);

        // If no tool was called, we have our final response
        if (functionCalls.length === 0) {
            const textPart = parts.find(p => p.text);
            console.log('[Agent] Final answer received after', iterations, 'iterations');
            return {
                success: true,
                answer: textPart ? textPart.text : 'No response generated',
                iterations
            };
        }

        // Execute all function calls and collect their responses
        const functionResponseParts = [];

        for (const call of functionCalls) {
            const { name, args } = call;
            console.log(`[Agent] Gemini requested tool: ${name}`);
            console.log(`[Agent] Tool args:`, JSON.stringify(args));

            const cacheKey = name + ':' + JSON.stringify(args);
            let toolResult;

            if (cache[cacheKey]) {
                console.log(`[Agent] Cache hit for: ${name} — skipping DB call`);
                toolResult = cache[cacheKey];
            } else {
                try {
                    if (!toolImplementations[name]) {
                        throw new Error('Unknown tool: ' + name);
                    }

                    console.log(`[Agent] Executing tool: ${name}...`);
                    toolResult = await toolImplementations[name](args);
                    cache[cacheKey] = toolResult;
                    console.log(`[Agent] Tool success: ${name} →`, JSON.stringify(toolResult).substring(0, 300));
                } catch (err) {
                    console.error(`[Agent] Tool failed: ${name} →`, err.message);
                    toolResult = { success: false, message: err.message };
                }
            }

            functionResponseParts.push({
                functionResponse: {
                    name: name,
                    response: {
                        result: toolResult
                    }
                }
            });
        }

        console.log(`[Agent] Sending tool result back to Gemini...`);
        // Append tool results under role: 'user' explicitly
        contents.push({
            role: 'user',
            parts: functionResponseParts
        });
    }

    console.warn('[Agent] Max iterations reached without final answer');
    return {
        success: false,
        answer: 'Agent reached maximum iterations without a final answer.',
        iterations
    };
}

module.exports = { runScreeningAgent };