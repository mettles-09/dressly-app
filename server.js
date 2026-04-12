const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

if (!ANTHROPIC_API_KEY) {
  console.warn('⚠️  No ANTHROPIC_API_KEY — running in demo mode.');
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
};

function readBody(req) {
  return new Promise((res, rej) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => res(b)); req.on('error', rej);
  });
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function callAnthropic(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, apiRes => {
      let data = '';
      apiRes.on('data', c => data += c);
      apiRes.on('end', () => resolve({ status: apiRes.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function demoOutfits(count) {
  const all = [
    { name: 'Casual Confidence', items: ['White Oxford shirt', 'Dark wash jeans', 'White sneakers'], reason: 'A clean, timeless combination that works for almost any casual occasion. The white shirt keeps things fresh while dark jeans add structure without effort.', vibe: 'clean · relaxed · sharp' },
    { name: 'Smart Weekend', items: ['Navy blue tee', 'Beige chinos', 'Brown loafers'], reason: 'Navy and beige is a foolproof pairing — the neutral tones complement each other without clashing. Loafers elevate it just enough for brunch or a gallery visit.', vibe: 'smart · effortless · warm' },
    { name: 'Layered Edge', items: ['Grey marl tee', 'Dark wash jeans', 'Olive bomber jacket', 'White sneakers'], reason: 'The olive bomber adds colour interest over a neutral base. Slim jeans and sneakers keep the silhouette clean and modern.', vibe: 'casual · layered · street' },
    { name: 'Polished Casual', items: ['White Oxford shirt', 'Beige chinos', 'Brown loafers'], reason: 'A slightly dressed-up take on casual — works well for office-casual environments or dinner with friends. A classic that never misses.', vibe: 'refined · versatile · classic' },
  ];
  return all.slice(0, parseInt(count) || 3);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/suggest') {
    try {
      const { messages, count } = JSON.parse(await readBody(req));
      if (!ANTHROPIC_API_KEY) {
        await new Promise(r => setTimeout(r, 900));
        return json(res, 200, { content: [{ type: 'text', text: JSON.stringify(demoOutfits(count || 3)) }] });
      }
      const result = await callAnthropic({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, messages });
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(result.body);
    } catch (e) { json(res, 500, { error: e.message }); }
    return;
  }

  // Static files
  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';
  filePath = path.join(__dirname, 'www', filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`✅  Dressly → http://localhost:${PORT}`);
  if (!ANTHROPIC_API_KEY) console.log(`ℹ️   Demo mode active. Set ANTHROPIC_API_KEY for real AI suggestions.`);
});
