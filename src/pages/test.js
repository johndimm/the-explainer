export default function Test() {
  return (
    <div style={{ 
      position: 'fixed', 
      top: '0px', 
      left: '0px', 
      right: '0px', 
      bottom: '0px', 
      background: 'green', 
      color: 'white', 
      padding: '20px', 
      fontSize: '20px', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }}>
      TEST PAGE LOADED!<br />
      Time: {new Date().toLocaleTimeString()}<br />
      UserAgent: {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) : 'server'}...
    </div>
  );
} 