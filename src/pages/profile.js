import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { t, getUserLanguage } from '@/i18n';
import { X } from 'lucide-react';

const LANGUAGES = [
  'English', 'French', 'German', 'Spanish', 'Italian', 'Chinese', 'Japanese', 'Russian', 'Portuguese', 'Arabic', 'Hindi', 'Other'
];
const COUNTRIES = [
  'United States', 'France', 'Germany', 'Spain', 'Italy', 'China', 'Japan', 'Russia', 'Brazil', 'India', 'United Kingdom', 'Canada', 'Other'
];

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'custom', label: 'Custom' },
];

const MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'gpt-4', label: 'GPT-4 (legacy)' },
    { value: 'gpt-4-32k', label: 'GPT-4 32k (legacy)' },
    { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16k (legacy)' },
  ],
  anthropic: [
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    { value: 'claude-2.1', label: 'Claude 2.1' },
    { value: 'claude-2.0', label: 'Claude 2.0' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek LLM' },
  ],
  gemini: [
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash' },
  ],
  custom: [
    { value: '', label: 'Custom' },
  ],
};

export default function Profile() {
  const router = useRouter();
  const [language, setLanguage] = useState('');
  const [age, setAge] = useState('');
  const [nationality, setNationality] = useState('');
  const [lang, setLang] = useState('en');
  const [showSaved, setShowSaved] = useState(false);
  const [translations, setTranslations] = useState({});
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmModel, setLlmModel] = useState('gpt-4o');
  const [llmKey, setLlmKey] = useState('');
  const [llmEndpoint, setLlmEndpoint] = useState('');
  const [llmCustomModel, setLlmCustomModel] = useState('');

  useEffect(() => {
    setLang(getUserLanguage());
    const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
    setLanguage(profile.language || '');
    setAge(profile.age || '');
    setNationality(profile.nationality || '');
    // Load translations for the current language
    loadTranslations();
    const llm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
    setLlmProvider(llm.provider || 'openai');
    setLlmModel(llm.model || 'gpt-4o');
    setLlmKey(llm.key || '');
    setLlmEndpoint(llm.endpoint || '');
    setLlmCustomModel(llm.customModel || '');
  }, []);

  const loadTranslations = async () => {
    const currentLang = getUserLanguage();
    if (currentLang === 'en') {
      setTranslations({
        profileSettings: 'Profile Settings',
        aboutYourInfo: 'About Your Information',
        aboutYourInfoDesc: 'This information is stored locally on your device (no accounts or servers). It helps the AI craft age-appropriate responses and make cultural references relevant to your background. For example, a 6-year-old will get simpler explanations than an adult, and someone from France might get different cultural context than someone from Japan.',
        language: 'Language',
        age: 'Age',
        nationality: 'Nationality',
        selectLanguage: 'Select language',
        selectNationality: 'Select nationality',
        yourAge: 'Your age',
        profileSaved: 'Settings saved automatically'
      });
    } else {
      try {
        const keys = ['profileSettings', 'aboutYourInfo', 'aboutYourInfoDesc', 'language', 'age', 'nationality', 'selectLanguage', 'selectNationality', 'yourAge', 'profileSaved'];
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
          aboutYourInfoDesc: 'This information is stored locally on your device (no accounts or servers). It helps the AI craft age-appropriate responses and make cultural references relevant to your background. For example, a 6-year-old will get simpler explanations than an adult, and someone from France might get different cultural context than someone from Japan.',
          language: 'Language',
          age: 'Age',
          nationality: 'Nationality',
          selectLanguage: 'Select language',
          selectNationality: 'Select nationality',
          yourAge: 'Your age',
          profileSaved: 'Settings saved automatically'
        });
      }
    }
  };

  // Auto-save function
  const autoSave = (updates) => {
    const currentProfile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
    const newProfile = { ...currentProfile, ...updates };
    localStorage.setItem('explainer:profile', JSON.stringify(newProfile));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const autoSaveLlm = (updates) => {
    const currentLlm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
    const newLlm = { ...currentLlm, ...updates };
    localStorage.setItem('explainer:llm', JSON.stringify(newLlm));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleClose = () => {
    router.back();
  };

  // Guard: Only render UI if translations are loaded
  if (!translations.profileSettings || !translations.aboutYourInfo || !translations.aboutYourInfoDesc) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <span>Loading translations...</span>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0, 0, 0, 0.5)', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      zIndex: 1000 
    }}>
      <div style={{ 
        background: '#fff', 
        borderRadius: 16, 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
        padding: 32, 
        minWidth: 320, 
        maxWidth: 400, 
        width: '100%',
        position: 'relative',
        maxHeight: '90vh',
        overflow: 'auto'
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
          {translations.profileSettings || 'Profile Settings'}
        </h1>

        <div style={{ 
          background: '#f8fafc', 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 24, 
          border: '1px solid #e2e8f0',
          fontSize: 14,
          lineHeight: 1.5,
          color: '#475569'
        }}>
          <strong style={{ color: '#1e293b', display: 'block', marginBottom: 8 }}>
            {translations.aboutYourInfo || 'About Your Information'}
          </strong>
          {translations.aboutYourInfoDesc || 'This information is stored locally on your device (no accounts or servers). It helps the AI craft age-appropriate responses and make cultural references relevant to your background. For example, a 6-year-old will get simpler explanations than an adult, and someone from France might get different cultural context than someone from Japan.'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
            {translations.language || 'Language'}
            <select 
              value={language} 
              onChange={e => {
                setLanguage(e.target.value);
                autoSave({ language: e.target.value });
                // Reload translations when language changes
                setTimeout(() => loadTranslations(), 100);
              }} 
              style={{ 
                width: '100%', 
                marginTop: 8, 
                padding: 12, 
                borderRadius: 8, 
                border: '1px solid #cbd5e1', 
                fontSize: 16,
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
                padding: 12, 
                borderRadius: 8, 
                border: '1px solid #cbd5e1', 
                fontSize: 16,
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
                padding: 12, 
                borderRadius: 8, 
                border: '1px solid #cbd5e1', 
                fontSize: 16,
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
            LLM Provider
            <select
              value={llmProvider}
              onChange={e => {
                setLlmProvider(e.target.value);
                setLlmModel(MODELS[e.target.value][0]?.value || '');
                autoSaveLlm({ provider: e.target.value, model: MODELS[e.target.value][0]?.value || '' });
              }}
              style={{ width: '100%', marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, background: '#fff', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            >
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>

          <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
            Model
            <select
              value={llmModel}
              onChange={e => {
                setLlmModel(e.target.value);
                autoSaveLlm({ model: e.target.value });
              }}
              style={{ width: '100%', marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, background: '#fff', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            >
              {MODELS[llmProvider].map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>

          <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
            API Key
            <input
              type="password"
              value={llmKey}
              onChange={e => {
                setLlmKey(e.target.value);
                autoSaveLlm({ key: e.target.value });
              }}
              placeholder="Paste your API key here"
              style={{ width: '100%', marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, background: '#fff', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            />
          </label>

          {llmProvider === 'custom' && (
            <>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
                Custom Endpoint
                <input
                  type="text"
                  value={llmEndpoint}
                  onChange={e => {
                    setLlmEndpoint(e.target.value);
                    autoSaveLlm({ endpoint: e.target.value });
                  }}
                  placeholder="https://api.your-llm.com/v1/chat"
                  style={{ width: '100%', marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, background: '#fff', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </label>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
                Custom Model Name
                <input
                  type="text"
                  value={llmCustomModel}
                  onChange={e => {
                    setLlmCustomModel(e.target.value);
                    autoSaveLlm({ customModel: e.target.value });
                  }}
                  placeholder="your-model-name"
                  style={{ width: '100%', marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, background: '#fff', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </label>
            </>
          )}
        </div>

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