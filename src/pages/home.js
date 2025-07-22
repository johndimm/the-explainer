export default function Home() {
  return (
    <html>
      <head>
        <title>Home Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{
        margin: 0,
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'purple',
        color: 'white',
        fontSize: '20px',
        textAlign: 'center'
      }}>
        <h1>HOME PAGE WORKS!</h1>
        <p>Time: {new Date().toLocaleTimeString()}</p>
        <p>This is /home - redirected from /</p>
        <p>If you see this purple page, the root path has an issue</p>
      </body>
    </html>
  );
} 