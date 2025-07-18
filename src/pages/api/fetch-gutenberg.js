import fs from 'fs';
import path from 'path';

// Simple HTML text extraction function
function extractTextFromHTML(html) {
  // Remove script and style elements completely
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Replace common block elements with line breaks
  text = text.replace(/<\/(div|p|br|h[1-6]|li|tr|td|th)>/gi, '\n');
  text = text.replace(/<(br|hr)\s*\/?>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&rsquo;': '\u2019',
    '&lsquo;': '\u2018',
    '&rdquo;': '\u201D',
    '&ldquo;': '\u201C'
  };
  
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n\n'); // Multiple newlines to double
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces to single
  text = text.trim();
  
  return text;
}

export default async function handler(req, res) {
  const { url } = req.query;

  console.log('API called with URL:', url);

  if (!url || typeof url !== 'string') {
    console.log('Invalid URL:', url);
    res.status(400).json({ error: 'Invalid or missing URL.' });
    return;
  }

  try {
    // Check if it's a local file in public directory
    if (url.startsWith('/public-domain-texts/')) {
      console.log('Processing local file:', url);
      const filePath = path.join(process.cwd(), 'public', url);
      console.log('File path:', filePath);
      
      // Security check: ensure the path is within the public directory
      const publicPath = path.join(process.cwd(), 'public');
      if (!filePath.startsWith(publicPath)) {
        console.log('Security check failed: path outside public directory');
        res.status(400).json({ error: 'Invalid file path.' });
        return;
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log('File not found:', filePath);
        res.status(404).json({ error: 'File not found.' });
        return;
      }
      
      console.log('File found, reading content...');
      // Read and return the file
      const text = fs.readFileSync(filePath, 'utf8');
      console.log('File read successfully, length:', text.length);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(text);
      return;
    }
    
    // Handle external URLs (must be http/https)
    if (!/^https?:\/\//.test(url)) {
      res.status(400).json({ error: 'Invalid URL format. Use http:// or https:// for external URLs.' });
      return;
    }

    const response = await fetch(url);
    if (!response.ok) {
      res.status(500).json({ error: `Failed to fetch: ${response.status}` });
      return;
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Check if it's a PDF - no longer supported
    if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
      console.log('PDF detected via URL - not supported');
      res.status(400).json({ 
        error: 'PDF files are not supported. Please use text files (.txt) instead.' 
      });
      return;
    }
    
    // Handle HTML and text content
    let text = await response.text();
    
    // If the content appears to be HTML, extract text from it
    if (contentType.includes('text/html') || text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
      console.log('Detected HTML content, extracting text...');
      text = extractTextFromHTML(text);
      
      // Validate that we got meaningful text
      if (!text || text.length < 100) {
        res.status(400).json({ error: 'The HTML page does not contain enough readable text content.' });
        return;
      }
      
      console.log('Extracted text length:', text.length);
    }
    
    // Set content type to text/plain
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching content.' });
  }
} 