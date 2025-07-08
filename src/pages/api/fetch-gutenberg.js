export default async function handler(req, res) {
  const { url } = req.query;

  // Basic validation: must be a valid http(s) URL
  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    res.status(400).json({ error: 'Invalid or missing URL.' });
    return;
  }

  try {
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