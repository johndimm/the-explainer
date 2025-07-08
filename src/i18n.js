// Simple i18n utility for UI translations

const translations = {
  en: {
    chat: 'Chat',
    saveChat: 'Save Chat',
    library: 'Library',
    profile: 'Profile',
    profileSettings: 'Profile Settings',
    askFollowup: 'Ask a follow-up question...',
    selectTextPrompt: 'Select text from the left panel to start a conversation',
    loading: 'Loading...',
    thinking: 'Thinking...',
    exploreLibrary: 'Explore classic literature in many languages. Click a book to start reading!',
    showMore: '(More...)',
    showLess: '(Show Less)',
    back: 'Back',
    // Add more as needed
  },
  fr: {
    chat: 'Discussion',
    saveChat: 'Enregistrer la discussion',
    library: 'Bibliothèque',
    profile: 'Profil',
    profileSettings: 'Paramètres du profil',
    askFollowup: 'Posez une question de suivi...',
    selectTextPrompt: 'Sélectionnez du texte dans le panneau de gauche pour commencer une conversation',
    loading: 'Chargement...',
    thinking: 'Réflexion...',
    exploreLibrary: 'Explorez la littérature classique dans de nombreuses langues. Cliquez sur un livre pour commencer à lire !',
    showMore: '(Plus...)',
    showLess: '(Moins...)',
    back: 'Retour',
    // Add more as needed
  },
};

function getUserLanguage() {
  if (typeof window !== 'undefined') {
    const profile = localStorage.getItem('explainer:profile');
    if (profile) {
      try {
        const lang = JSON.parse(profile).language;
        if (lang && lang.toLowerCase().startsWith('fr')) return 'fr';
        if (lang && lang.toLowerCase().startsWith('en')) return 'en';
        // Add more language checks as needed
      } catch {}
    }
  }
  return 'en';
}

export { getUserLanguage };

export function t(key, langOverride) {
  const lang = langOverride || getUserLanguage();
  return translations[lang]?.[key] || translations['en'][key] || key;
} 