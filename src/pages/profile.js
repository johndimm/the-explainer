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

export default function Profile() {
  const router = useRouter();
  const [language, setLanguage] = useState('');
  const [age, setAge] = useState('');
  const [nationality, setNationality] = useState('');
  const [lang, setLang] = useState('en');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setLang(getUserLanguage());
    const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
    setLanguage(profile.language || '');
    setAge(profile.age || '');
    setNationality(profile.nationality || '');
  }, []);

  // Auto-save function
  const autoSave = (updates) => {
    const currentProfile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
    const newProfile = { ...currentProfile, ...updates };
    localStorage.setItem('explainer:profile', JSON.stringify(newProfile));
    
    // Show saved indicator
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleClose = () => {
    router.back();
  };

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
          {t('profileSettings', lang)}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
            {t('language', lang) || 'Language'}
            <select 
              value={language} 
              onChange={e => {
                setLanguage(e.target.value);
                autoSave({ language: e.target.value });
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
              <option value="">{t('selectLanguage', lang) || 'Select language'}</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>
            {t('age', lang) || 'Age'}
            <input 
              type="number" 
              min="1" 
              max="120" 
              value={age} 
              onChange={e => {
                setAge(e.target.value);
                autoSave({ age: e.target.value });
              }} 
              placeholder={t('yourAge', lang) || 'Your age'} 
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
            {t('nationality', lang) || 'Nationality'}
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
              <option value="">{t('selectNationality', lang) || 'Select nationality'}</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
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
            ✓ {t('profileSaved', lang) || 'Settings saved automatically'}
          </div>
        )}
      </div>
    </div>
  );
} 