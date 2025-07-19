import pdf from 'pdf-parse';

// Configure body parser for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb', // Allow up to 15MB for PDF uploads (base64 encoding makes files ~33% larger)
    },
    responseLimit: false, // No limit on response size
  },
};

// Helper function to add timeout to async operations
function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('PDF processing timeout')), timeoutMs)
    )
  ]);
}

// Helper function to prevent stack overflow in text processing
function safeTextProcessing(text, maxIterations = 1000) {
  let processedText = text;
  let iterations = 0;
  
  // Limit the number of text processing iterations
  while (iterations < maxIterations) {
    const beforeLength = processedText.length;
    
    // Basic cleaning only - avoid complex regex that might cause issues
    processedText = processedText
      .replace(/\r\n/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();
    
    const afterLength = processedText.length;
    
    // If no change was made, we're done
    if (beforeLength === afterLength) {
      break;
    }
    
    iterations++;
  }
  
  // If we hit the iteration limit, return the last processed version
  if (iterations >= maxIterations) {
    console.warn('Text processing hit iteration limit, returning partial result');
  }
  
  return processedText;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!req.body || !req.body.pdfData) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    const { pdfData, fileName } = req.body;
    const pdfBuffer = Buffer.from(pdfData, 'base64');

    // Check file size (max 10MB)
    const pdfSizeMB = pdfBuffer.length / (1024 * 1024);
    if (pdfSizeMB > 10) {
      return res.status(400).json({ 
        error: `PDF file is too large (${pdfSizeMB.toFixed(1)}MB). Maximum size is 10MB.` 
      });
    }

    console.log('Starting simple PDF extraction...', 'Size:', pdfSizeMB.toFixed(1), 'MB');

    // Wrap PDF extraction in timeout to prevent infinite recursion
    let data;
    let extractionMethod = 'default';
    
    try {
    
    // Try multiple extraction strategies - optimized for complex PDFs
    const strategies = [
      { normalizeWhitespace: true, disableCombineTextItems: false, max: 1000 }, // Limit pages for first attempt
      { normalizeWhitespace: false, disableCombineTextItems: true, max: 1000 },
      { normalizeWhitespace: true, disableCombineTextItems: true, max: 1000 },
      { normalizeWhitespace: false, disableCombineTextItems: false, max: 1000 },
      // If all fail, try without page limits
      { normalizeWhitespace: true, disableCombineTextItems: false },
      { normalizeWhitespace: false, disableCombineTextItems: true },
      { normalizeWhitespace: true, disableCombineTextItems: true },
      { normalizeWhitespace: false, disableCombineTextItems: false }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Trying PDF extraction strategy ${i + 1}:`, strategies[i]);
        extractionMethod = `strategy-${i + 1}`;
        
        // Dynamic timeout based on file size: 2MB = 8min, 5MB = 12min, 10MB = 15min
        const serverTimeoutMs = Math.max(480000, Math.min(900000, pdfSizeMB * 180000)); // 8-15 minutes
        console.log(`Server timeout for strategy ${i + 1}:`, serverTimeoutMs / 1000, 'seconds');
        
        data = await withTimeout(
          pdf(pdfBuffer, strategies[i]),
          serverTimeoutMs
        );
        
        // If we got some text, break out of the loop
        if (data.text && data.text.length > 10) {
          console.log(`Strategy ${i + 1} successful, got ${data.text.length} characters`);
          break;
        } else {
          console.log(`Strategy ${i + 1} produced only ${data.text?.length || 0} characters, trying next strategy`);
        }
      } catch (strategyError) {
        console.log(`Strategy ${i + 1} failed:`, strategyError.message);
        if (i === strategies.length - 1) {
          // If all strategies failed, throw the last error
          throw strategyError;
        }
        // Continue to next strategy
        continue;
      }
    }
  } catch (pdfError) {
    console.error('PDF parsing error:', pdfError);
    
    if (pdfError.message.includes('timeout')) {
      return res.status(408).json({ 
        error: 'PDF processing took too long. The file might be too complex or corrupted.' 
      });
    }
    
    if (pdfError.message.includes('Invalid PDF')) {
      return res.status(400).json({ 
        error: 'The file is not a valid PDF or is corrupted.' 
      });
    }
    
    if (pdfError.message.includes('password')) {
      return res.status(400).json({ 
        error: 'This PDF is password protected and cannot be processed.' 
      });
    }

    // If we get a stack overflow or other serious error, return a generic message
    if (pdfError.message.includes('Maximum call stack size exceeded') || 
        pdfError.message.includes('stack overflow') ||
        pdfError.message.includes('RangeError') ||
        pdfError.message.includes('call stack')) {
      return res.status(500).json({ 
        error: 'The PDF is too complex or corrupted to process. Please try a different PDF file.' 
      });
    }

    throw pdfError; // Re-throw other errors
  }

    console.log('PDF extraction result:', {
      hasText: !!data.text,
      textLength: data.text?.length || 0,
      numPages: data.numpages || 0,
      first100Chars: data.text?.substring(0, 100) || 'No text',
      hasUnprintableChars: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(data.text || '')
    });

    // Check if we have any meaningful text content
    if (!data.text || data.text.length === 0) {
      return res.status(400).json({ 
        error: `The PDF appears to be empty or contains no extractable text. Extracted ${data.text?.length || 0} characters from ${data.numpages || 0} pages.` 
      });
    }

    // For very small text (less than 20 characters), check if it's just whitespace or special characters
    if (data.text.length < 20) {
      const meaningfulText = data.text.replace(/\s/g, '').replace(/[^\w\s.,!?;:()\-]/g, '');
      if (meaningfulText.length === 0) {
        return res.status(400).json({ 
          error: `The PDF contains only whitespace or special characters. Extracted ${data.text.length} characters from ${data.numpages || 0} pages.` 
        });
      }
    }

    // Use safe text processing to prevent stack overflow
    let cleanedText;
    try {
      cleanedText = safeTextProcessing(data.text);
    } catch (processingError) {
      console.error('Text processing error:', processingError);
      // If text processing fails, return the raw text
      cleanedText = data.text.replace(/\r\n/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();
    }

    console.log('PDF text extracted successfully, length:', cleanedText.length);

    res.status(200).json({ 
      text: cleanedText,
      fileName: fileName || 'Extracted PDF',
      extractionMethod: extractionMethod,
      pageCount: data.numpages || 0
    });

  } catch (error) {
    console.error('Simple PDF extraction error:', error);
    
    // Handle stack overflow errors specifically
    if (error.message.includes('Maximum call stack size exceeded') || 
        error.message.includes('stack overflow') ||
        error.message.includes('RangeError') ||
        error.message.includes('call stack')) {
      return res.status(500).json({ 
        error: 'The PDF is too complex or corrupted to process. Please try a different PDF file.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to extract text from PDF. The file might be corrupted or contain no extractable text.' 
    });
  }
} 