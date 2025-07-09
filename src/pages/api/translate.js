export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, targetLanguage } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return res.status(400).json({ error: 'Target language is required' });
    }

    // Don't translate if target is English
    if (targetLanguage === 'en') {
      return res.status(200).json({ translation: text });
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      // Return the original text if no API key is configured
      return res.status(200).json({ translation: text });
    }

    // Map language codes to full names for better LLM understanding
    const languageMap = {
      'fr': 'French',
      'de': 'German', 
      'es': 'Spanish',
      'it': 'Italian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ru': 'Russian',
      'pt': 'Portuguese',
      'ar': 'Arabic',
      'hi': 'Hindi'
    };

    const targetLangName = languageMap[targetLanguage] || targetLanguage;

    const systemPrompt = `You are a professional translator. Translate the given text to ${targetLangName}. 

Important guidelines:
- Maintain the same tone and style as the original
- Keep any technical terms or proper nouns that shouldn't be translated
- Preserve any formatting or special characters
- Return only the translated text, nothing else
- If the text is already in ${targetLangName}, return it unchanged

Translate the following text to ${targetLangName}:`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const translation = data.choices[0]?.message?.content?.trim();

      if (!translation) {
        throw new Error('No translation received from OpenAI');
      }

      res.status(200).json({ 
        translation,
        originalText: text,
        targetLanguage: targetLangName
      });

    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // If it's a quota or rate limit issue, return original text
      if (openaiError.message.includes('quota') || openaiError.message.includes('429')) {
        console.log('Quota exceeded, returning original text');
        return res.status(200).json({ translation: text });
      }
      
      res.status(500).json({ 
        error: 'Failed to translate text',
        details: openaiError.message
      });
    }

  } catch (error) {
    console.error('Error in translate API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 