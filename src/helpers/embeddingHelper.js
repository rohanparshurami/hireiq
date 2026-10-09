const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pinecone } = require('@pinecone-database/pinecone');
const https = require('https');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'hireiq-embeddings';
const EMBEDDING_DIMENSION = 3072;

let indexReady = false;

async function getIndex() {
    if (!indexReady) {
        await pinecone.createIndex({
            name: INDEX_NAME,
            dimension: EMBEDDING_DIMENSION,
            metric: 'cosine',
            spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
            suppressConflicts: true,
        });
        indexReady = true;
    }
    return pinecone.index(INDEX_NAME);
}

async function generateEmbedding(text) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GEMINI_API_KEY;
        const body = JSON.stringify({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text }] }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1/models/gemini-embedding-001:embedContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const parsed = JSON.parse(data);
                if (parsed.embedding) {
                    resolve(parsed.embedding.values);
                } else {
                    reject(new Error(JSON.stringify(parsed)));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function storeEmbedding(id, text, metadata = {}) {
  const index = await getIndex();
  const vector = await generateEmbedding(text);
  if (!vector || vector.length === 0) {
      throw new Error('Empty vector returned from Gemini');
  }
  const record = { id: id.toString(), values: vector, metadata: metadata };
  await index.upsert({ records: [record] });
  return vector;
}

async function searchSimilar(text, topK = 5, filter = {}) {
    const index = await getIndex();
    const vector = await generateEmbedding(text);
    const results = await index.query({
        vector, topK, includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
    });
    return results.matches;
}

async function deleteEmbedding(id) {
    const index = await getIndex();
    await index.deleteOne(id.toString());
}

module.exports = { generateEmbedding, storeEmbedding, searchSimilar, deleteEmbedding };