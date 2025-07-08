export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, bookTitle, bookAuthor, userLanguage } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Default to Romeo and Juliet if no book info provided
    const title = bookTitle || 'Romeo and Juliet';
    const author = bookAuthor || 'William Shakespeare';

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      // Provide a mock response for testing when API key is not configured
      const mockExplanation = `This is a mock explanation for demonstration purposes. The OpenAI API key is not configured.

Selected text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"

To get real explanations, please configure your OPENAI_API_KEY environment variable in your .env.local file.

For now, here's what this text might mean:
- This appears to be from Shakespeare's Romeo and Juliet
- The language is Early Modern English, which can be challenging for modern readers
- Many words may have different meanings than they do today
- The text likely contains references to Elizabethan customs and beliefs`;
      
      return res.status(200).json({ 
        explanation: mockExplanation,
        timestamp: new Date().toISOString()
      });
    }

    console.log('OpenAI API key found, attempting to call OpenAI API...');

    // System prompt for text explanation, now including author and title
    const languageInstruction = userLanguage ? `Please respond in ${userLanguage}.` : 'Respond in the same language as the input text unless specifically asked otherwise.';
    
    const systemPrompt = `You are a helpful assistant that explains difficult texts in an engaging and educational way. The user is reading "${title}" by ${author}. When explaining text, you should:

1. Explain difficult or archaic words and what they mean
2. Explain familiar words that had different meanings in the past
3. Provide context about what the selection means
4. Share essential background info about characters or story elements
5. Explain what's happening at this point in the story
6. Discuss why this moment matters

Make your explanations compelling and not boring. Feel free to make occasional jokes and have a personality. Be conversational and helpful while being informative.

${languageInstruction}`;

    try {
      console.log('Making request to OpenAI API...');
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
            { role: 'user', content: `Please explain this text from "${title}":\n\n${text}` }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI API response received successfully');
      
      const explanation = data.choices[0]?.message?.content;

      if (!explanation) {
        throw new Error('No explanation received from OpenAI');
      }

      res.status(200).json({ 
        explanation,
        timestamp: new Date().toISOString()
      });

    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // If it's a quota or rate limit issue, fall back to mock response
      if (openaiError.message.includes('quota') || openaiError.message.includes('429')) {
        console.log('Quota exceeded, falling back to mock response');
        const mockExplanation = `This is a mock explanation for demonstration purposes. The OpenAI API quota has been exceeded.

Selected text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"

To get real explanations, please check your OpenAI API billing and usage limits.

For now, here's what this text might mean:
- This appears to be from Shakespeare's Romeo and Juliet
- The language is Early Modern English, which can be challenging for modern readers
- Many words may have different meanings than they do today
- The text likely contains references to Elizabethan customs and beliefs`;
        
        return res.status(200).json({ 
          explanation: mockExplanation,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to get explanation from OpenAI',
        details: openaiError.message
      });
    }

  } catch (error) {
    console.error('Error in explain API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 