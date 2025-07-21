import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { t, getUserLanguage } from '@/i18n';
import { X, HelpCircle, CreditCard } from 'lucide-react';
import { useSession, signOut, signIn } from 'next-auth/react';

const LANGUAGES = [
  'English', 'French', 'German', 'Spanish', 'Italian', 'Chinese', 'Japanese', 'Russian', 'Portuguese', 'Arabic', 'Hindi', 'Other'
];
const COUNTRIES = [
  'United States', 'France', 'Germany', 'Spain', 'Italy', 'China', 'Japan', 'Russia', 'Brazil', 'India', 'United Kingdom', 'Canada', 'Other'
];
const EDUCATIONAL_LEVELS = [
  'Elementary School',
  'High School Dropout',
  'High School Graduate',
  'Some College',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctorate/PhD',
  'Professional Degree (MD, JD, etc.)'
];

const FONT_FAMILIES = [
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'Times New Roman', label: 'Times New Roman (Serif)' },
  { value: 'Arial', label: 'Arial (Sans-serif)' },
  { value: 'Helvetica', label: 'Helvetica (Sans-serif)' },
  { value: 'Verdana', label: 'Verdana (Sans-serif)' },
  { value: 'Tahoma', label: 'Tahoma (Sans-serif)' },
  { value: 'Consolas', label: 'Consolas (Monospace)' },
  { value: 'Monaco', label: 'Monaco (Monospace)' },
  { value: 'Courier New', label: 'Courier New (Monospace)' },
];

const FONT_SIZES = [
  { value: '12', label: '12px' },
  { value: '14', label: '14px' },
  { value: '15', label: '15px' },
  { value: '16', label: '16px' },
  { value: '17', label: '17px (Default)' },
  { value: '18', label: '18px' },
  { value: '20', label: '20px' },
  { value: '22', label: '22px' },
  { value: '24', label: '24px' },
  { value: '26', label: '26px' },
  { value: '28', label: '28px' },
];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal (Default)' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi-bold' },
  { value: '700', label: 'Bold' },
];

const RESPONSE_LENGTHS = [
  { value: 'short', label: 'Short (2-3 sentences)' },
  { value: 'medium', label: 'Medium (4-6 sentences)' },
  { value: 'long', label: 'Long (8-12 sentences)' },
  { value: 'detailed', label: 'Detailed (15+ sentences)' },
];

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4, GPT-3.5)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'custom', label: 'Custom/BYOLLM' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
  { value: 'gpt-4o', label: 'GPT-4o (Best Quality)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const ANTHROPIC_MODELS = [
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Best Quality)' },
  { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fast & Cheap)' },
];

const DEEPSEEK_MODELS = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek-coder', label: 'DeepSeek Coder' },
];

const GEMINI_MODELS = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Best Quality)' },
];

export default function Profile() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [language, setLanguage] = useState('');
  const [age, setAge] = useState('');
  const [nationality, setNationality] = useState('');
  const [educationalLevel, setEducationalLevel] = useState('');
  const [defaultResponseLength, setDefaultResponseLength] = useState('medium');
  const [lang, setLang] = useState('en');
  const [showSaved, setShowSaved] = useState(false);
  const [translations, setTranslations] = useState({});
  const [userStats, setUserStats] = useState(null);
  const [fontFamily, setFontFamily] = useState('Georgia');
  const [fontSize, setFontSize] = useState('17');
  const [fontWeight, setFontWeight] = useState('400');
  const [isMobile, setIsMobile] = useState(false);
  
  // LLM settings state
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmModel, setLlmModel] = useState('gpt-4o-mini');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmEndpoint, setLlmEndpoint] = useState('');
  const [llmCustomModel, setLlmCustomModel] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      setLang(getUserLanguage());
      const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
      setLanguage(profile.language || '');
      setAge(profile.age || '');
      setNationality(profile.nationality || '');
      setEducationalLevel(profile.educationalLevel || '');
      setDefaultResponseLength(profile.defaultResponseLength || 'medium');
      setFontFamily(profile.fontFamily || 'Georgia');
      setFontSize(profile.fontSize || '17');
      setFontWeight(profile.fontWeight || '400');
      
      // Load LLM settings
      const llm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
      setLlmProvider(llm.provider || 'openai');
      setLlmModel(llm.model || 'gpt-4o-mini');
      setLlmApiKey(llm.key || '');
      setLlmEndpoint(llm.endpoint || '');
      setLlmCustomModel(llm.customModel || '');
      
      loadTranslations();
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      async function fetchStats() {
        if (session?.user?.email) {
          try {
            const res = await fetch(`/api/user-stats?email=${encodeURIComponent(session.user.email)}`);
            if (res.ok) {
              const stats = await res.json();
              setUserStats(stats);
            }
          } catch (e) {
            // ignore
          }
        }
      }
      fetchStats();
    }
  }, [isClient, session?.user?.email]);

  const loadTranslations = async () => {
    const currentLang = getUserLanguage();
    if (currentLang === 'fr') {
      setTranslations({
        profileSettings: 'Paramètres du profil',
        aboutYourInfo: 'À Propos de Vos Informations',
        aboutYourInfoDesc: 'Ces informations sont stockées localement sur votre appareil (aucun compte ni serveur). Elles aident l\'IA à créer des réponses adaptées à l\'âge et à faire des références culturelles pertinentes pour votre contexte.',
        language: 'Langue',
        age: 'Âge',
        nationality: 'Nationalité',
        educationalLevel: 'Niveau d\'éducation',
        selectLanguage: 'Choisir la langue',
        selectNationality: 'Choisir la nationalité',
        selectEducationalLevel: 'Sélectionner le niveau d\'éducation',
        yourAge: 'Votre âge',
        profileSaved: 'Paramètres enregistrés automatiquement'
      });
    } else {
      try {
        const keys = ['profileSettings', 'aboutYourInfo', 'aboutYourInfoDesc', 'language', 'age', 'nationality', 'educationalLevel', 'selectLanguage', 'selectNationality', 'selectEducationalLevel', 'yourAge', 'profileSaved'];
        const translationPromises = keys.map(key => t(key, currentLang));
        const results = await Promise.all(translationPromises);
        const newTranslations = {};
        keys.forEach((key, index) => {
          newTranslations[key] = results[index];
        });
        setTranslations(newTranslations);
      } catch (error) {
        setTranslations({
          profileSettings: 'Profile Settings',
          aboutYourInfo: 'About Your Information',
          aboutYourInfoDesc: 'This information is stored locally on your device (no accounts or servers). It helps the AI craft age-appropriate responses and make cultural references relevant to your background.',
          language: 'Language',
          age: 'Age',
          nationality: 'Nationality',
          educationalLevel: 'Educational Level',
          selectLanguage: 'Select language',
          selectNationality: 'Select nationality',
          selectEducationalLevel: 'Select educational level',
          yourAge: 'Your age',
          profileSaved: 'Settings saved automatically'
        });
      }
    }
  };

  const autoSave = (updates) => {
    const currentProfile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
    const newProfile = { ...currentProfile, ...updates };
    localStorage.setItem('explainer:profile', JSON.stringify(newProfile));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const saveLlmSettings = () => {
    const llmSettings = {
      provider: llmProvider,
      model: llmModel,
      key: llmApiKey,
      endpoint: llmEndpoint,
      customModel: llmCustomModel
    };
    localStorage.setItem('explainer:llm', JSON.stringify(llmSettings));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleClose = () => {
    router.back();
  };

  const handleBookClick = async (book) => {
    try {
      localStorage.setItem('explainer:current-text', book.title);
      router.push('/');
    } catch (error) {
      console.error('Error loading book:', error);
    }
  };

  // Show loading screen until client is ready and translations are loaded
  if (!isClient) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <span>Loading content...</span>
      </div>
    );
  }

  // Show loading screen while translations are loading
  if (!translations.profileSettings) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <span>Loading content...</span>
      </div>
    );
  }

  return (
    <div className="profile-settings-container" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      color: '#18181b',
      WebkitTextFillColor: '#18181b',
      textShadow: 'none',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: isMobile ? 16 : 32,
        minWidth: isMobile ? 'auto' : 540,
        maxWidth: isMobile ? '95vw' : 900,
        width: '100%',
        position: 'relative',
        maxHeight: isMobile ? '95vh' : '90vh',
        overflow: 'auto',
        margin: isMobile ? '10px' : '0'
      }}>
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 6,
            color: '#64748b',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.target.style.background = '#f1f5f9';
            e.target.style.color = '#1e293b';
          }}
          onMouseLeave={e => {
            e.target.style.background = 'none';
            e.target.style.color = '#64748b';
          }}
        >
          <X size={20} />
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, color: '#1e293b', paddingRight: 40 }}>
          Settings
        </h1>

        {/* Account Section */}
        <section style={{ 
          marginBottom: 32,
          padding: 24,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#334155' }}>Account</h2>
          {session ? (
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 16,
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#166534' }}>✓ Signed in as {session.user.email}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>You have access to hourly credits and can purchase additional credits.</div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a
                  href="/credits"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#2563eb'}
                  onMouseLeave={e => e.target.style.background = '#3b82f6'}
                >
                  <CreditCard size={16} />
                  View Credits
                </a>
                <button
                  onClick={() => signOut()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#dc2626'}
                  onMouseLeave={e => e.target.style.background = '#ef4444'}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 16,
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#92400e' }}>Sign in to unlock more features</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>
                  Get 1 free explanation every hour and the ability to purchase additional credits.
                </div>
              </div>
              <button
                onClick={() => signIn('google')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.target.style.background = '#2563eb'}
                onMouseLeave={e => e.target.style.background = '#3b82f6'}
              >
                Sign in with Google
              </button>
            </div>
          )}
        </section>

        {/* Profile Section */}
        <section style={{ 
          marginBottom: 32,
          padding: 24,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#334155' }}>Profile</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
            {translations.aboutYourInfoDesc}
          </p>
          
          {/* Personal Info - Two Columns */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: 16, 
            marginBottom: 24 
          }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              {translations.language || 'Language'}
              <select
                value={language}
                onChange={e => {
                  setLanguage(e.target.value);
                  autoSave({ language: e.target.value });
                  setTimeout(() => loadTranslations(), 100);
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                <option value="">{translations.selectLanguage || 'Select language'}</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              {translations.age || 'Age'}
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={e => {
                  setAge(e.target.value);
                  autoSave({ age: e.target.value });
                }}
                placeholder={translations.yourAge || 'Your age'}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
            </label>
            
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              {translations.nationality || 'Nationality'}
              <select
                value={nationality}
                onChange={e => {
                  setNationality(e.target.value);
                  autoSave({ nationality: e.target.value });
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                <option value="">{translations.selectNationality || 'Select nationality'}</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            
                        <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              {translations.educationalLevel || 'Educational Level'}
              <select
                value={educationalLevel}
                onChange={e => {
                  setEducationalLevel(e.target.value);
                  autoSave({ educationalLevel: e.target.value });
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                <option value="">{translations.selectEducationalLevel || 'Select educational level'}</option>
                {EDUCATIONAL_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              Default Response Length
              <select
                value={defaultResponseLength}
                onChange={e => {
                  setDefaultResponseLength(e.target.value);
                  autoSave({ defaultResponseLength: e.target.value });
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                {RESPONSE_LENGTHS.map(length => <option key={length.value} value={length.value}>{length.label}</option>)}
              </select>
            </label>
          </div>
        </section>


        {/* LLM Settings Section */}
        <section style={{ 
          marginBottom: 32,
          padding: 24,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#334155' }}>AI Model Settings</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
            Choose which AI model to use for explanations. You can use our default models or bring your own API key for better rates.
          </p>
          
          {/* Provider and Model Selection - Two Columns */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: 16, 
            marginBottom: 24 
          }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              AI Provider
              <select
                value={llmProvider}
                onChange={e => {
                  setLlmProvider(e.target.value);
                  // Reset model to first available for new provider
                  if (e.target.value === 'openai') setLlmModel('gpt-4o-mini');
                  else if (e.target.value === 'anthropic') setLlmModel('claude-3-5-sonnet-20241022');
                  else if (e.target.value === 'deepseek') setLlmModel('deepseek-chat');
                  else if (e.target.value === 'gemini') setLlmModel('gemini-1.5-flash');
                  else if (e.target.value === 'custom') setLlmModel('');
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                {LLM_PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              Model
              <select
                value={llmModel}
                onChange={e => setLlmModel(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                {llmProvider === 'openai' && OPENAI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
                {llmProvider === 'anthropic' && ANTHROPIC_MODELS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
                {llmProvider === 'deepseek' && DEEPSEEK_MODELS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
                {llmProvider === 'gemini' && GEMINI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
                {llmProvider === 'custom' && (
                  <option value="">Select custom model</option>
                )}
              </select>
            </label>
          </div>

          {/* Custom Settings (only show for custom provider) */}
          {llmProvider === 'custom' && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: 16, 
              marginBottom: 24 
            }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
                API Endpoint
                <input
                  type="text"
                  value={llmEndpoint}
                  onChange={e => setLlmEndpoint(e.target.value)}
                  placeholder="https://api.example.com/v1/chat/completions"
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: isMobile ? 12 : 10,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: isMobile ? 18 : 16,
                    background: '#fff',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </label>
              
              <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
                Model Name
                <input
                  type="text"
                  value={llmCustomModel}
                  onChange={e => setLlmCustomModel(e.target.value)}
                  placeholder="your-model-name"
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: isMobile ? 12 : 10,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: isMobile ? 18 : 16,
                    background: '#fff',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </label>
            </div>
          )}

          {/* API Key (only show for custom provider) */}
          {llmProvider === 'custom' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
                API Key
                <input
                  type="password"
                  value={llmApiKey}
                  onChange={e => setLlmApiKey(e.target.value)}
                  placeholder="sk-..."
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: isMobile ? 12 : 10,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: isMobile ? 18 : 16,
                    background: '#fff',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </label>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={saveLlmSettings}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.target.style.background = '#2563eb'}
            onMouseLeave={e => e.target.style.background = '#3b82f6'}
          >
            Save AI Settings
          </button>

          {/* Info about BYOLLM */}
          {llmProvider === 'custom' && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: '#dbeafe', 
              borderRadius: 8,
              border: '1px solid #93c5fd'
            }}>
              <div style={{ fontSize: 14, color: '#1e40af' }}>
                <strong>BYOLLM Benefit:</strong> Using your own API key gives you 5x efficiency (0.2 credits per explanation instead of 1.0).
              </div>
            </div>
          )}
        </section>

        {/* Font Settings Section */}
        <section style={{ 
          marginBottom: 32,
          padding: 24,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#334155' }}>Font Settings</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
            Customize the appearance of the text panel to improve readability.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: 16 
          }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              Font Family
              <select
                value={fontFamily}
                onChange={e => {
                  setFontFamily(e.target.value);
                  autoSave({ fontFamily: e.target.value });
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s',
                  fontFamily: fontFamily
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              Font Size
              <select
                value={fontSize}
                onChange={e => {
                  setFontSize(e.target.value);
                  autoSave({ fontSize: e.target.value });
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                {FONT_SIZES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            
            <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
              Font Weight
              <select
                value={fontWeight}
                onChange={e => {
                  setFontWeight(e.target.value);
                  autoSave({ fontWeight: e.target.value });
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: isMobile ? 12 : 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? 18 : 16,
                  background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                {FONT_WEIGHTS.map(w => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          
          {/* Font Preview */}
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            backgroundColor: '#f8fafc', 
            borderRadius: 8,
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ 
              fontFamily: fontFamily, 
              fontSize: fontSize + 'px',
              fontWeight: fontWeight,
              lineHeight: '1.5',
              color: '#18181b'
            }}>
              Preview: "To be or not to be, that is the question"
            </div>
          </div>
        </section>

        {/* History Section */}
        {userStats && (
          <section style={{ 
            marginBottom: 32,
            padding: 24,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#334155' }}>History</h2>
            
            {/* User stats summary - Two Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
              gap: 16,
              marginBottom: 20
            }}>
              <div style={{ fontSize: 16 }}>
                <strong>First login:</strong><br />
                {new Date(userStats.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 16 }}>
                <strong>Total explanations:</strong><br />
                {userStats.total_explanations}
              </div>
              <div style={{ fontSize: 16 }}>
                <strong>Today:</strong><br />
                {userStats.todays_explanations}
              </div>
            </div>

            {/* Books List */}
            {userStats.books && userStats.books.length > 0 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#334155' }}>
                  Books you&apos;ve explored
                </h3>
                <ul style={{ 
                  margin: 0, 
                  padding: 0, 
                  listStyle: 'none', 
                  columns: isMobile ? 1 : 2, 
                  columnGap: 32 
                }}>
                  {userStats.books.map((book, idx) => (
                    <li key={book.title + idx} style={{ marginBottom: 8, breakInside: 'avoid' }}>
                      <button
                        onClick={() => handleBookClick(book)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#3b82f6',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          fontSize: 'inherit',
                          fontFamily: 'inherit',
                          textAlign: 'left'
                        }}
                        onMouseEnter={e => e.target.style.color = '#1d4ed8'}
                        onMouseLeave={e => e.target.style.color = '#3b82f6'}
                      >
                        {book.title}
                      </button>
                      <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 8 }}>
                        ({book.count} explanation{book.count !== 1 ? 's' : ''})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Help & Guide Section */}
        <section style={{ 
          marginBottom: 32,
          padding: 24,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#334155' }}>Help & Guide</h2>
          <a
            href="/guide"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.target.style.background = '#f1f5f9';
              e.target.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={e => {
              e.target.style.background = '#fff';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <HelpCircle size={20} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>User Guide</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Learn how to use The Explainer effectively</div>
            </div>
          </a>
        </section>

        {/* Auto-save indicator */}
        {showSaved && (
          <div style={{
            color: '#16a34a',
            marginTop: 20,
            fontWeight: 500,
            textAlign: 'center',
            padding: 12,
            background: '#f0fdf4',
            borderRadius: 8,
            border: '1px solid #bbf7d0'
          }}>
            ✓ {translations.profileSaved || 'Settings saved automatically'}
          </div>
        )}
      </div>
    </div>
  );
} 