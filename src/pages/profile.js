import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { t, getUserLanguage } from '@/i18n';

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
  const [saved, setSaved] = useState(false);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    setLang(getUserLanguage());
    const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
    setLanguage(profile.language || '');
    setAge(profile.age || '');
    setNationality(profile.nationality || '');
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const profile = { language, age, nationality };
    localStorage.setItem('explainer:profile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.back();
    }, 1000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #0001', padding: 32, minWidth: 320, maxWidth: 400, width: '100%' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 18, color: '#1e293b' }}>{t('profile', lang)}</h1>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, color: '#334155' }}>
            {t('profileSettings', lang)}
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: '100%', marginTop: 6, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 16 }}>
              <option value="">{t('selectLanguage', lang) || 'Select language'}</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, color: '#334155' }}>
            {t('age', lang) || 'Age'}
            <input type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)} placeholder={t('yourAge', lang) || 'Your age'} style={{ width: '100%', marginTop: 6, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 16 }} />
          </label>
          <label style={{ display: 'block', marginBottom: 18, fontWeight: 600, color: '#334155' }}>
            {t('nationality', lang) || 'Nationality'}
            <select value={nationality} onChange={e => setNationality(e.target.value)} style={{ width: '100%', marginTop: 6, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 16 }}>
              <option value="">{t('selectNationality', lang) || 'Select nationality'}</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button type="submit" style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 600, fontSize: 16, cursor: 'pointer', width: '100%', marginTop: 8 }}>{t('saveProfile', lang) || 'Save'}</button>
          {saved && <div style={{ color: '#16a34a', marginTop: 14, fontWeight: 500, textAlign: 'center' }}>{t('profileSaved', lang) || 'Profile saved!'}</div>}
        </form>
        <button onClick={() => router.back()} style={{ marginTop: 24, background: 'none', color: '#3b82f6', border: 'none', fontSize: 15, cursor: 'pointer', textDecoration: 'underline' }}>{t('back', lang)}</button>
      </div>
    </div>
  );
} 