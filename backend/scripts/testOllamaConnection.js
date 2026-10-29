import dotenv from 'dotenv';

dotenv.config();

const url = process.env.LLM_API_URL;
const model = process.env.LLM_MODEL || 'llama3';

if (!url) {
  console.error('LLM_API_URL is not configured.');
  process.exit(1);
}

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  body: JSON.stringify({
    model,
    prompt: 'Hello from backend test code',
    stream: false,
  }),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Ollama API error (${response.status}): ${body}`);
}

const result = await response.json();

console.log(`Ollama connected: ${result.model || model}`);
console.log(`Response: ${result.response || '(empty response)'}`);
