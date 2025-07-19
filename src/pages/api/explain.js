import fetch from 'node-fetch';
import { Pool } from 'pg';
import cookie from 'cookie';
import { CreditManager } from '../../lib/credits.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function logUserActivity(email, bookTitle, model) {
  if (!email) return;
  const client = await pool.connect();
  try {
    // Get user id
    const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return;
    const userId = rows[0].id;
    // Insert activity
    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, activity_time, meta)
       VALUES ($1, $2, NOW(), $3)`,
      [userId, 'explanation', JSON.stringify({ bookTitle, model })]
    );
  } finally {
    client.release();
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      text, bookTitle, bookAuthor, userLanguage, userAge, userNationality, userEducationalLevel,
      provider, model, apiKey, endpoint, customModel, isFollowUp, speaker, userEmail
    } = req.body;

    // Paywall logic - 4 tiers of access
    if (!userEmail) {
      // Level 1: Anonymous user limit: 3 free explanations
      const cookies = cookie.parse(req.headers.cookie || '');
      const anonCount = parseInt(cookies.anon_explanations || '0', 10);
      if (anonCount >= 3) {
        return res.status(403).json({ 
          error: 'Sign in required after 3 free explanations. Please sign in to continue.',
          paywall: true,
          tier: 'anonymous'
        });
      }
    } else {
      // Level 2+: Signed-in users need credits
      const user = await CreditManager.getUserCredits(userEmail);
      if (!user) {
        return res.status(403).json({ error: 'User not found' });
      }

      const isByollm = provider === 'custom' && apiKey;
      const creditsNeeded = isByollm ? 0.2 : 1;

      // Always check for hourly credit first, regardless of current credit balance
      const canGetHourly = await CreditManager.canGetHourlyCredit(userEmail);
      
      if (canGetHourly) {
        // Grant hourly credit - this will be used first
        await CreditManager.grantHourlyCredit(userEmail);
      } else if (user.credits < creditsNeeded) {
        // User needs to wait or purchase credits
        const timeUntilNext = await CreditManager.getTimeUntilNextCredit(userEmail);
        const minutesUntilNext = Math.ceil(timeUntilNext / (1000 * 60));
        
        return res.status(403).json({
          error: `You need ${creditsNeeded} credit${creditsNeeded === 1 ? '' : 's'} to get an explanation. Your next hourly credit will be available in ${minutesUntilNext} minutes.`,
          paywall: true,
          tier: 'signed_in',
          creditsNeeded,
          currentCredits: user.credits,
          minutesUntilNext,
          purchaseUrl: '/profile#credits'
        });
      }
    }

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
      // Check if environment variable is available for the selected provider
      const envKeyMap = {
        'openai': 'OPENAI_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'deepseek': 'DEEPSEEK_API_KEY',
        'gemini': 'GEMINI_API_KEY'
      };
      
      const envKey = envKeyMap[provider];
      if (!envKey || !process.env[envKey]) {
        return res.status(400).json({ error: `API key is required for ${provider}. Please provide your own key or ensure the server has the ${envKey} environment variable configured.` });
      }
    }
    if (provider === 'custom' && (!endpoint || !customModel || !apiKey)) {
      return res.status(400).json({ error: 'Custom endpoint, model, and API key are required' });
    }

    // Default to Romeo and Juliet if no book info provided
    const title = bookTitle || 'Romeo and Juliet';
    const author = bookAuthor || 'William Shakespeare';

    // System prompt for text explanation, now including author, title, age, nationality, and educational level
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
    let educationalLevelInstruction = '';
    if (userEducationalLevel) {
      switch (userEducationalLevel) {
        case 'High School Dropout':
          educationalLevelInstruction = `The user has a high school dropout level of education. Use very simple, clear language. Avoid academic jargon and complex terminology. Explain concepts using everyday examples and analogies. Be patient and thorough in your explanations.`;
          break;
        case 'High School Graduate':
          educationalLevelInstruction = `The user has a high school education. Use clear, accessible language. You can use some academic terms but always explain them. Provide context and background information that would be familiar to someone with a high school education.`;
          break;
        case 'Some College':
          educationalLevelInstruction = `The user has some college education. You can use more sophisticated language and concepts, but still explain specialized terms. You can reference college-level knowledge and concepts.`;
          break;
        case 'Associate Degree':
          educationalLevelInstruction = `The user has an associate degree. You can use more advanced vocabulary and concepts. You can assume familiarity with basic academic concepts and terminology.`;
          break;
        case 'Bachelor\'s Degree':
          educationalLevelInstruction = `The user has a bachelor's degree. You can use sophisticated academic language and concepts. You can reference advanced theories and academic frameworks.`;
          break;
        case 'Master\'s Degree':
          educationalLevelInstruction = `The user has a master's degree. You can use highly sophisticated academic language and concepts. You can reference advanced theories, research methodologies, and academic discourse.`;
          break;
        case 'Doctorate/PhD':
          educationalLevelInstruction = `The user has a doctorate/PhD. You can use the most sophisticated academic language and concepts. You can reference advanced theories, research methodologies, and engage in complex academic discourse.`;
          break;
        case 'Professional Degree (MD, JD, etc.)':
          educationalLevelInstruction = `The user has a professional degree (MD, JD, etc.). You can use highly sophisticated language and concepts. You can reference advanced theories, professional terminology, and engage in complex discourse appropriate for a professional audience.`;
          break;
        default:
          educationalLevelInstruction = '';
      }
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
${nationalityInstruction}
${educationalLevelInstruction}`;
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
        
        // Handle rate limit errors gracefully
        if (response.status === 429) {
          let rateLimitMessage = `The ${provider} API is currently experiencing high usage. `;
          
          if (provider === 'gemini') {
            rateLimitMessage += "The free tier has been exceeded. You can:\n\n" +
              "• Switch to a different AI provider in your settings\n" +
              "• Use your own API key with higher limits\n" +
              "• Try again later when the rate limit resets\n\n" +
              "To switch providers, go to Settings → LLM Provider and select OpenAI, Anthropic, or DeepSeek.";
          } else if (provider === 'openai') {
            rateLimitMessage += "You've hit the rate limit. Please try again in a few minutes or switch to a different provider.";
          } else if (provider === 'anthropic') {
            rateLimitMessage += "You've hit the rate limit. Please try again in a few minutes or switch to a different provider.";
          } else {
            rateLimitMessage += "Please try again in a few minutes or switch to a different provider.";
          }
          
          return res.status(429).json({ 
            error: rateLimitMessage,
            rateLimited: true,
            provider: provider
          });
        }
        
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

      // Handle credit usage and activity logging
      if (userEmail) {
        // Use credits for signed-in users
        const isByollm = provider === 'custom' && apiKey;
        await CreditManager.useCredits(userEmail, provider, model, title, isByollm);
        
        // Log user activity
        await logUserActivity(userEmail, title, model);
      } else {
        // Increment anon_explanations cookie for anonymous users
        const cookies = cookie.parse(req.headers.cookie || '');
        const anonCount = parseInt(cookies.anon_explanations || '0', 10) + 1;
        res.setHeader('Set-Cookie', cookie.serialize('anon_explanations', String(anonCount), {
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/',
          sameSite: 'lax',
        }));
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