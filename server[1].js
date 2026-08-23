// TrueLens Backend
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const SIGHTENGINE_API_USER = process.env.SIGHTENGINE_API_USER;
const SIGHTENGINE_API_SECRET = process.env.SIGHTENGINE_API_SECRET;
const WINSTON_API_KEY = process.env.WINSTON_API_KEY;

app.get('/', (req, res) => {
  res.send('TrueLens backend is running.');
});

app.post('/check-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide some text.' });
    }

    const response = await fetch('https://api.gowinston.ai/v2/ai-content-detection', {
      method: 'POST',
      headers: { Authorization: `Bearer ${WINSTON_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), language: 'auto', sentences: false }),
    });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.description || data.error || 'Winston AI request failed.' });
    }

    const humanScore = data.score ?? 50;
    const aiScore = Math.round(100 - humanScore);

    res.json({
      score: aiScore,
      isAI: aiScore >= 50,
      reasons: [`Winston AI's model gives this a human-likeness score of ${humanScore}/100.`],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/check-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }
    const isPayment = req.body.isPayment === 'true';

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('media', req.file.buffer, { filename: 'upload.jpg' });
    formData.append('models', 'genai');
    formData.append('api_user', SIGHTENGINE_API_USER);
    formData.append('api_secret', SIGHTENGINE_API_SECRET);

    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });
    const data = await response.json();

    if (data.status === 'failure') {
      return res.status(400).json({ error: data.error?.message || 'Sightengine request failed.' });
    }

    const aiProb = data.type?.ai_generated ?? 0;
    const score = Math.round(aiProb * 100);
    const reasons = [`Sightengine's AI-detection model returned a raw score of ${score}%.`];
    if (isPayment) {
      reasons.push('This only checks if the image looks AI-edited. It does NOT confirm the transaction happened — always verify in your bank/UPI app.');
    }

    res.json({ score, isAI: score >= 50, reasons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TrueLens backend running on port ${PORT}`));
