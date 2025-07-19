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

    console.log('Starting improved PDF extraction...', 'Size:', pdfSizeMB.toFixed(1), 'MB');

    // Try multiple parsing strategies
    const strategies = [
      { normalizeWhitespace: true, disableCombineTextItems: false },
      { normalizeWhitespace: false, disableCombineTextItems: true },
      { normalizeWhitespace: true, disableCombineTextItems: true },
      { normalizeWhitespace: false, disableCombineTextItems: false }
    ];

    let bestText = null;
    let bestScore = 0;
    let bestStrategy = null;

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Trying strategy ${i + 1}:`, strategies[i]);
        
        const data = await pdf(pdfBuffer, strategies[i]);
        const rawText = data.text;
        
        if (!rawText || rawText.length < 50) {
          console.log(`Strategy ${i + 1} produced too little text:`, rawText?.length || 0);
          continue;
        }

        // Clean the text
        let cleanedText = rawText
          .replace(/\r\n/g, '\n')
          .replace(/\n\s*\n/g, '\n\n')
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n\n')
          .trim();

        // If too many question marks, apply aggressive cleaning
        let questionMarkRatio = (cleanedText.match(/\?/g) || []).length / cleanedText.length;
        if (questionMarkRatio > 0.1) {
          console.log(`Strategy ${i + 1} has high question mark ratio:`, questionMarkRatio);
          cleanedText = rawText
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            .replace(/[^\x20-\x7E]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
          questionMarkRatio = (cleanedText.match(/\?/g) || []).length / cleanedText.length;
        }

        // Score the result
        const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
        const readableCharRatio = (cleanedText.match(/[a-zA-Z0-9\s.,!?;:()]/g) || []).length / cleanedText.length;
        
        let score = 0;
        score += Math.min(1, wordCount / 100) * 40; // Word count bonus
        score += readableCharRatio * 30; // Readable character ratio
        score += (1 - questionMarkRatio) * 30; // Inverse question mark ratio

        console.log(`Strategy ${i + 1} score:`, score, 'words:', wordCount, 'questionMarkRatio:', questionMarkRatio);

        if (score > bestScore) {
          bestScore = score;
          bestText = cleanedText;
          bestStrategy = i + 1;
        }

      } catch (strategyError) {
        console.log(`Strategy ${i + 1} failed:`, strategyError.message);
        continue;
      }
    }

    if (!bestText || bestText.length < 100) {
      console.log('All strategies failed or produced insufficient text');
      return res.status(400).json({ 
        error: 'The PDF appears to be empty, unreadable, or contains no extractable text.' 
      });
    }

    // Additional cleaning for common PDF artifacts
    let finalText = bestText
      // Remove common PDF artifacts
      .replace(/\f/g, '\n') // Form feeds to newlines
      .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only printable ASCII and newlines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Remove excessive blank lines
      .trim();

    // Final quality check
    const finalQuestionMarkRatio = (finalText.match(/\?/g) || []).length / finalText.length;
    const hasEncodingIssues = finalQuestionMarkRatio > 0.05;

    console.log('Final extraction result:', {
      strategy: bestStrategy,
      score: bestScore,
      length: finalText.length,
      questionMarkRatio: finalQuestionMarkRatio,
      hasEncodingIssues: hasEncodingIssues,
      first100Chars: finalText.substring(0, 100)
    });

    res.status(200).json({ 
      text: finalText,
      fileName: fileName || 'Extracted PDF',
      extractionStrategy: bestStrategy,
      qualityScore: bestScore,
      warning: hasEncodingIssues ? 'This PDF may have encoding issues. Some characters may appear as question marks.' : null
    });

  } catch (error) {
    console.error('Improved PDF extraction error:', error);
    
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