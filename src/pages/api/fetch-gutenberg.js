import fs from 'fs';
import path from 'path';

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
    // Set content type to text/plain
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const text = await response.text();
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching content.' });
  }
} 