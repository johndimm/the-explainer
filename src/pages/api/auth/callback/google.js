export default function handler(req, res) {
  // You can customize the redirect target if needed
  res.writeHead(302, { Location: '/' });
  res.end();
} 