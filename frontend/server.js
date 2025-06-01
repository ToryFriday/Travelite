const express = require('express');
const path    = require('path');
const axios   = require('axios');
const multer  = require('multer');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Watson credentials
const { API_KEY, PROJECT_ID, MODEL_ID } = process.env; // MODEL_ID = default text model

/* ── express setup ── */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

/* ── file upload (memory) ── */
const upload = multer();

/* ── token cache ── */
let cachedToken = null, tokenExpiry = 0;
async function getIamToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const params = new URLSearchParams({
    grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
    apikey: API_KEY
  });
  const { data } = await axios.post(
    'https://iam.cloud.ibm.com/identity/token',
    params,
    { headers:{ 'Content-Type':'application/x-www-form-urlencoded' } }
  );
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

/* ── routes ── */
app.get('/', (_,res) => res.render('chat'));

app.post('/chat', upload.single('image'), async (req,res) => {
  try {
    const userText = req.body.message?.trim();
    const picked   = req.body.model_id || MODEL_ID;

    const messages = [
      { role:'system', content:'You are Travelite, a helpful travel assistant.' }
    ];

    if (req.file) {
      const mime = req.file.mimetype || 'image/jpeg';
      const dataUri = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
      const contentArr = [ { type:'image_url', image_url:{ url:dataUri } } ];
      if (userText) contentArr.push({ type:'text', text:userText });
      messages.push({ role:'user', content: contentArr });
    } else if (userText) {
      messages.push({ role:'user', content: userText });
    }

    const token = await getIamToken();
    const { data } = await axios.post(
      'https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29',
      { project_id: PROJECT_ID, model_id: picked, max_tokens: 200, messages },
      { headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' } }
    );

    const reply = data?.choices?.[0]?.message?.content || '🤖 No reply.';
    res.json({ reply });
  } catch (err) {
    console.error('Watson error:', err.response?.data || err.message);
    res.json({ reply:'⚠️ Watson AI error. Please try again.' + err.response?.data || err.message});
  }
});

/* ── start ── */
console.log('🔐 API_KEY present:', !!API_KEY);
console.log('🧩 PROJECT_ID:', PROJECT_ID);
console.log('🧠 Default MODEL:', MODEL_ID);
app.listen(PORT, () => console.log(`Travelite Chat UI → http://localhost:${PORT}`));