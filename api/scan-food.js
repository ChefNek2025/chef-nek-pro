// ============================================
// Chef Nek Pro — AI Food Scanner API Route
// Vercel Serverless Function
//
// The Anthropic API key lives ONLY here as an
// environment variable — never in the frontend code.
//
// Setup:
//   Vercel Dashboard → Your Project → Settings
//   → Environment Variables → Add:
//   Name:  ANTHROPIC_KEY
//   Value: sk-ant-api03-xxxx...
// ============================================

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — allow your Vercel domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  // Key is read from Vercel environment — never exposed to browser
  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `You are a professional nutritionist and chef. Analyze this food photo and provide:
1. Dish name and description
2. Estimated portion size in grams
3. Total calorie estimate for the portion shown
4. Main ingredients with individual calorie estimates
5. Nutrition highlights (protein, carbs, fat rough estimates)

Respond ONLY in this exact JSON format with no other text:
{
  "dish": "Name of the dish",
  "description": "Brief description",
  "portion_grams": 350,
  "total_calories": 520,
  "confidence": "high",
  "ingredients": [
    {"name": "ingredient", "grams": 100, "calories": 165},
    {"name": "ingredient", "grams": 80, "calories": 104}
  ],
  "nutrition": {
    "protein": "35g",
    "carbs": "45g",
    "fat": "18g"
  },
  "notes": "Any important notes about the dish"
}`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Anthropic API error ' + response.status
      });
    }

    // Forward the result back to the frontend
    return res.status(200).json({ text: data.content[0].text });

  } catch (err) {
    console.error('scan-food error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
