import pdf from 'pdf-parse';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if there's a file in the request
    if (!req.body || !req.body.pdfData) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    const { pdfData, fileName } = req.body;

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfData, 'base64');

    // Extract text from PDF with improved options
    let data;
    let extractedText;
    
    try {
      data = await pdf(pdfBuffer, {
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
      extractedText = data.text;
    } catch (firstError) {
      console.log('First PDF parsing attempt failed, trying alternative approach:', firstError.message);
      
      // Try alternative parsing options
      try {
        data = await pdf(pdfBuffer, {
          normalizeWhitespace: false,
          disableCombineTextItems: true
        });
        extractedText = data.text;
      } catch (secondError) {
        console.log('Second PDF parsing attempt also failed:', secondError.message);
        throw new Error('Unable to extract text from this PDF. It may be corrupted or contain no extractable text.');
      }
    }

    // Validate extracted text
    if (!extractedText || extractedText.trim().length < 100) {
      console.log('PDF extraction result:', {
        textLength: extractedText?.length || 0,
        trimmedLength: extractedText?.trim().length || 0,
        first100Chars: extractedText?.substring(0, 100),
        hasUnprintableChars: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(extractedText || '')
      });
      return res.status(400).json({ 
        error: 'The PDF appears to be empty, unreadable, or contains no extractable text.' 
      });
    }

    // Clean up the extracted text
    let cleanedText = extractedText
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n\s*\n/g, '\n\n') // Remove excessive blank lines
      // Remove or replace unprintable characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Remove excessive blank lines again
      .trim();

    // If we still have too many question marks, try a more aggressive approach
    let questionMarkRatio = (cleanedText.match(/\?/g) || []).length / cleanedText.length;
    if (questionMarkRatio > 0.1) { // If more than 10% are question marks
      console.log('High question mark ratio detected, applying aggressive cleaning');
      cleanedText = extractedText
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove all control characters
        .replace(/[^\x20-\x7E]/g, ' ') // Keep only basic ASCII printable characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n\s*\n/g, '\n\n') // Remove excessive blank lines
        .trim();
      
      // Check if aggressive cleaning helped
      questionMarkRatio = (cleanedText.match(/\?/g) || []).length / cleanedText.length;
      if (questionMarkRatio > 0.05) { // If still more than 5% are question marks
        console.log('PDF has severe encoding issues, text may be unreadable');
        // Continue with the cleaned text but warn the user
      }
    }

    // Log some debugging info
    console.log('PDF text extraction debug:', {
      originalLength: extractedText.length,
      cleanedLength: cleanedText.length,
      originalFirst100: extractedText.substring(0, 100),
      cleanedFirst100: cleanedText.substring(0, 100),
      hasQuestionMarks: cleanedText.includes('?'),
      questionMarkCount: (cleanedText.match(/\?/g) || []).length
    });

    // Check for encoding issues
    const hasEncodingIssues = questionMarkRatio > 0.05;
    
    res.status(200).json({ 
      text: cleanedText,
      fileName: fileName || 'Extracted PDF',
      pageCount: data.numpages,
      info: data.info,
      warning: hasEncodingIssues ? 'This PDF may have encoding issues. Some characters may appear as question marks.' : null
    });

  } catch (error) {
    console.error('PDF extraction error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('Invalid PDF')) {
      return res.status(400).json({ 
        error: 'The file is not a valid PDF or is corrupted.' 
      });
    }
    
    if (error.message.includes('password')) {
      return res.status(400).json({ 
        error: 'This PDF is password protected and cannot be processed.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to extract text from PDF. The file might be corrupted or contain no extractable text.' 
    });
  }
} 