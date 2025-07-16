console.log('Server timezone info:');
console.log('Date.now():', Date.now());
console.log('new Date():', new Date());
console.log('new Date().toISOString():', new Date().toISOString());
console.log('new Date().toString():', new Date().toString());
console.log('new Date().getTimezoneOffset():', new Date().getTimezoneOffset());
console.log('process.env.TZ:', process.env.TZ);
console.log('Intl.DateTimeFormat().resolvedOptions().timeZone:', Intl.DateTimeFormat().resolvedOptions().timeZone);