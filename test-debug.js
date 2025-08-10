console.log('Testing localStorage:'); const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}'); console.log('Profile:', profile); console.log('Layout mode:', profile.layoutMode);
