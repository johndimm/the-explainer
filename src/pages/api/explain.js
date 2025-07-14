import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      text, bookTitle, bookAuthor, userLanguage, userAge, userNationality,
      provider, model, apiKey, endpoint, customModel, isFollowUp, speaker
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    if (!provider) {
      return res.status(400).json({ error: 'LLM provider is required' });
    }
    if (!model && provider !== 'custom') {
      return res.status(400).json({ error: 'Model is required' });
    }
    if (!apiKey && provider !== 'custom') {
      // Fallback to env for OpenAI only
      if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        // ok
      } else if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        // ok
      } else if (provider === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
        // ok
      } else if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
        // ok
      } else {
        return res.status(400).json({ error: 'API key is required for this provider' });
      }
    }
    if (provider === 'custom' && (!endpoint || !customModel || !apiKey)) {
      return res.status(400).json({ error: 'Custom endpoint, model, and API key are required' });
    }

    // Default to Romeo and Juliet if no book info provided
    const title = bookTitle || 'Romeo and Juliet';
    const author = bookAuthor || 'William Shakespeare';

    // System prompt for text explanation, now including author, title, age, and nationality
    const languageInstruction = userLanguage ? `Please respond in ${userLanguage}.` : 'Respond in the same language as the input text unless specifically asked otherwise.';
    let ageInstruction = '';
    if (userAge) {
      const age = parseInt(userAge);
      if (age <= 8) {
        ageInstruction = `The user is ${age} years old. Use simple, clear language appropriate for a young child. Avoid complex vocabulary and explain concepts in basic terms. Use short sentences and be very patient and encouraging.`;
      } else if (age <= 12) {
        ageInstruction = `The user is ${age} years old. Use age-appropriate language for a pre-teen. Explain concepts clearly but don't oversimplify. Use engaging examples and analogies that would make sense to someone this age.`;
      } else if (age <= 16) {
        ageInstruction = `The user is ${age} years old. Use language appropriate for a teenager. You can use more sophisticated vocabulary but still explain complex concepts clearly. Be engaging and relatable to this age group.`;
      } else {
        ageInstruction = `The user is ${age} years old. You can use adult-level vocabulary and explanations, but still be clear and engaging.`;
      }
    }
    let nationalityInstruction = '';
    if (userNationality) {
      nationalityInstruction = `The user is from ${userNationality}. When explaining cultural references, historical context, or social customs, consider what might be familiar or unfamiliar to someone from this background.`;
    }
    const systemPrompt = `You are a helpful assistant that explains difficult texts in an engaging and educational way. The user is reading "${title}" by ${author}. When explaining text, you write about interesting information that answers these suggested questions. Do not repeat the questions in your response.

1. Explain difficult or archaic words and what they mean
2. Explain familiar words that had different meanings in the past
3. Provide context about what the selection means
4. Share essential background info about characters or story elements
5. Explain what's happening at this point in the story
6. Discuss why this moment matters

IMPORTANT: Match the tone of the text you're explaining. If the text is tragic, serious, or dramatic, be more solemn and respectful in your explanation. If the text is humorous, lighthearted, or playful, feel free to be more casual and make jokes. If the text is formal or academic, maintain a scholarly tone. Let the emotional weight and style of the original text guide your response.

Make your explanations compelling and not boring. Feel free to make occasional jokes when appropriate, but always respect the tone of the source material. Be conversational and helpful while being informative.

${languageInstruction}
${ageInstruction}
${nationalityInstruction}`;
    let userPrompt;
    if (isFollowUp) {
      userPrompt = `The user has a follow-up question about the text. Please answer their question clearly and helpfully.\n\nQuestion: ${text}`;
    } else {
      if (speaker) {
        userPrompt = `This quote is spoken by ${speaker}.\nPlease explain this text from \"${title}\":\n\n${text}`;
      } else {
        userPrompt = `Please explain this text from \"${title}\":\n\n${text}`;
      }
    }

    // Helper: get API key (user > env)
    function getKey(envVar) {
      return apiKey || process.env[envVar];
    }

    // Provider routing
    let apiUrl, reqBody, reqHeaders;
    if (provider === 'openai') {
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      reqHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getKey('OPENAI_API_KEY')}`
      };
      reqBody = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      };
    } else if (provider === 'anthropic') {
      apiUrl = 'https://api.anthropic.com/v1/messages';
      reqHeaders = {
        'Content-Type': 'application/json',
        'x-api-key': getKey('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01'
      };
      reqBody = {
        model: model,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      };
    } else if (provider === 'deepseek') {
      apiUrl = 'https://api.deepseek.com/v1/chat/completions';
      reqHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getKey('DEEPSEEK_API_KEY')}`
      };
      reqBody = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      };
    } else if (provider === 'gemini') {
      apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';
      reqHeaders = {
        'Content-Type': 'application/json',
      };
      reqBody = {
        contents: [
          { role: 'user', parts: [ { text: `${systemPrompt}\n\n${userPrompt}` } ] }
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      };
      // Gemini uses key in URL
      apiUrl += `?key=${getKey('GEMINI_API_KEY')}`;
    } else if (provider === 'custom') {
      apiUrl = endpoint;
      reqHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      reqBody = {
        model: customModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      };
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }

    // Make the request
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(reqBody)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      let explanation;
      if (provider === 'openai' || provider === 'deepseek' || provider === 'custom') {
        explanation = data.choices?.[0]?.message?.content;
      } else if (provider === 'anthropic') {
        explanation = data.content || data.completion || data.messages?.[0]?.content;
      } else if (provider === 'gemini') {
        explanation = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
      if (!explanation) {
        throw new Error('No explanation received from model');
      }
      res.status(200).json({ 
        explanation,
        timestamp: new Date().toISOString()
      });
    } catch (llmError) {
      console.error('LLM API error:', llmError);
      res.status(500).json({ 
        error: `Failed to get explanation from ${provider}`,
        details: llmError.message
      });
    }
  } catch (error) {
    console.error('Error in explain API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 