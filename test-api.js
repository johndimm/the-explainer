require('dotenv').config({ path: '.env.local' });

async function testOpenAI() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.log('No OpenAI API key found');
    return;
  }
  
  console.log('API key found, testing...');
  
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
          { role: 'user', content: 'Say "Hello, this is a test"' }
        ],
        max_tokens: 50
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
    } else {
      const data = await response.json();
      console.log('Success! Response:', data.choices[0]?.message?.content);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOpenAI(); 