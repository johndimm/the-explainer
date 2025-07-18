require('dotenv').config({ path: '.env.local' });

async function testPdfExtraction() {
  console.log('Testing PDF extraction API...');
  
  try {
    // Test with invalid data first
    console.log('\n1. Testing with invalid data...');
    const invalidResponse = await fetch('http://localhost:3000/api/extract-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfData: 'invalid-data'
      })
    });
    
    console.log('Invalid data response status:', invalidResponse.status);
    const invalidResult = await invalidResponse.json();
    console.log('Invalid data response:', invalidResult);
    
    // Test with missing data
    console.log('\n2. Testing with missing data...');
    const missingResponse = await fetch('http://localhost:3000/api/extract-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    console.log('Missing data response status:', missingResponse.status);
    const missingResult = await missingResponse.json();
    console.log('Missing data response:', missingResult);
    
    // Test with wrong method
    console.log('\n3. Testing with GET method...');
    const getResponse = await fetch('http://localhost:3000/api/extract-pdf', {
      method: 'GET'
    });
    
    console.log('GET method response status:', getResponse.status);
    const getResult = await getResponse.json();
    console.log('GET method response:', getResult);
    
    console.log('\n✅ PDF extraction API tests completed!');
    console.log('Note: To test with actual PDF data, you would need to provide a real PDF file.');
    
  } catch (error) {
    console.error('❌ Error testing PDF extraction API:', error.message);
    console.log('Make sure the development server is running on http://localhost:3000');
  }
}

testPdfExtraction(); 