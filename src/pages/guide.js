import { useState, useEffect } from 'react';
import Head from 'next/head';
import { ArrowLeft, BookOpen, MessageSquare, MousePointer, Smartphone, Settings, Globe, Search } from 'lucide-react';
import { t, getUserLanguage } from '@/i18n';
import styles from '@/styles/Guide.module.css';

export default function Guide() {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    setLang(getUserLanguage());
  }, []);

  return (
    <>
      <Head>
        <title>User Guide - The Explainer</title>
        <meta name="description" content="Learn how to use The Explainer to understand difficult texts" />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <a href="/home" className={styles.backLink}>
            <ArrowLeft size={20} />
            {t('backToApp', lang)}
          </a>
          <h1>{t('userGuide', lang)}</h1>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>
              <BookOpen size={24} />
              {t('gettingStarted', lang)}
            </h2>
            <p>{t('gettingStartedDesc', lang)}</p>
            
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h3>{t('chooseText', lang)}</h3>
                  <p>{t('chooseTextDesc', lang)}</p>
                </div>
              </div>
              
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h3>{t('selectText', lang)}</h3>
                  <p>{t('selectTextDesc', lang)}</p>
                </div>
              </div>
              
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h3>{t('getExplanation', lang)}</h3>
                  <p>{t('getExplanationDesc', lang)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>
              <MousePointer size={24} />
              {t('textSelection', lang)}
            </h2>
            
            <div className={styles.platformSection}>
              <h3>
                <MousePointer size={20} />
                {t('desktopSelection', lang)}
              </h3>
              <div className={styles.instructions}>
                <div className={styles.instruction}>
                  <strong>{t('singleLine', lang)}:</strong> {t('singleLineDesc', lang)}
                </div>
                <div className={styles.instruction}>
                  <strong>{t('multipleLines', lang)}:</strong> {t('multipleLinesDesc', lang)}
                </div>
                <div className={styles.instruction}>
                  <strong>{t('dragSelection', lang)}:</strong> {t('dragSelectionDesc', lang)}
                </div>
              </div>
            </div>

            <div className={styles.platformSection}>
              <h3>
                <Smartphone size={20} />
                {t('mobileSelection', lang)}
              </h3>
              <div className={styles.instructions}>
                <div className={styles.instruction}>
                  <strong>{t('singleLineMobile', lang)}:</strong> {t('singleLineMobileDesc', lang)}
                </div>
                <div className={styles.instruction}>
                  <strong>{t('rangeSelectionMobile', lang)}:</strong> {t('rangeSelectionMobileDesc', lang)}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>
              <BookOpen size={24} />
              {t('library', lang)}
            </h2>
            <p>{t('libraryDesc', lang)}</p>
            
            <div className={styles.collections}>
              <div className={styles.collection}>
                <h4>📚 {t('top100', lang)}</h4>
                <p>{t('top100Desc', lang)}</p>
              </div>
              
              <div className={styles.collection}>
                <h4>🎭 {t('shakespeare', lang)}</h4>
                <p>{t('shakespeareDesc', lang)}</p>
              </div>
              
              <div className={styles.collection}>
                <h4>🇫🇷 {t('french', lang)}</h4>
                <p>{t('frenchDesc', lang)}</p>
              </div>
              
              <div className={styles.collection}>
                <h4>🇮🇹 {t('italian', lang)}</h4>
                <p>{t('italianDesc', lang)}</p>
              </div>
              
              <div className={styles.collection}>
                <h4>📝 {t('poetry', lang)}</h4>
                <p>{t('poetryDesc', lang)}</p>
              </div>
            </div>

            <div className={styles.customUrl}>
              <h4>{t('customText', lang)}</h4>
              <p>{t('customTextDesc', lang)}</p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>
              <MessageSquare size={24} />
              {t('chatFeatures', lang)}
            </h2>
            
            <div className={styles.features}>
              <div className={styles.feature}>
                <h4>{t('followUpQuestions', lang)}</h4>
                <p>{t('followUpQuestionsDesc', lang)}</p>
              </div>
              
              <div className={styles.feature}>
                <h4>{t('saveChat', lang)}</h4>
                <p>{t('saveChatDesc', lang)}</p>
              </div>
              
              <div className={styles.feature}>
                <h4>{t('multilingual', lang)}</h4>
                <p>{t('multilingualDesc', lang)}</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>
              <Settings size={24} />
              {t('settings', lang)}
            </h2>
            
            <div className={styles.settings}>
              <div className={styles.setting}>
                <h4>{t('language', lang)}</h4>
                <p>{t('languageDesc', lang)}</p>
              </div>
              
              <div className={styles.setting}>
                <h4>{t('age', lang)}</h4>
                <p>{t('ageDesc', lang)}</p>
              </div>
              
              <div className={styles.setting}>
                <h4>{t('nationality', lang)}</h4>
                <p>{t('nationalityDesc', lang)}</p>
              </div>
              
              <div className={styles.setting}>
                <h4>{t('educationalLevel', lang)}</h4>
                <p>{t('educationalLevelDesc', lang)}</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>
              <Search size={24} />
              {t('searchInterface', lang)}
            </h2>
            
            <div className={styles.searchFeatures}>
              <div className={styles.feature}>
                <h4>{t('textSearch', lang)}</h4>
                <p>{t('textSearchDesc', lang)}</p>
              </div>
              
              <div className={styles.feature}>
                <h4>{t('searchNavigation', lang)}</h4>
                <p>{t('searchNavigationDesc', lang)}</p>
              </div>
              
              <div className={styles.feature}>
                <h4>{t('searchKeyboard', lang)}</h4>
                <p>{t('searchKeyboardDesc', lang)}</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>{t('tips', lang)}</h2>
            <ul className={styles.tips}>
              <li>{t('tip1', lang)}</li>
              <li>{t('tip2', lang)}</li>
              <li>{t('tip3', lang)}</li>
              <li>{t('tip4', lang)}</li>
              <li>{t('tip5', lang)}</li>
              <li>{t('tip6', lang)}</li>
              <li>{t('tip7', lang)}</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
} 