export default function Home() {
  return (
    <html>
      <head>
        <title>Bare Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{
        margin: 0,
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'red',
        color: 'white',
        fontSize: '20px',
        textAlign: 'center'
      }}>
        <h1>BARE PAGE WORKS!</h1>
        <p>Time: {new Date().toLocaleTimeString()}</p>
        <p>If you see this red page, the issue is in React/Next.js</p>
        <p>If you still see "Loading content...", the issue is deeper</p>
      </body>
    </html>
  );
}
