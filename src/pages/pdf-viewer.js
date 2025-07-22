import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, BookOpen } from 'lucide-react';
import PDFViewerNew from '../components/PDFViewerNew';
import ExplanationConfirmDialog from '../components/ExplanationConfirmDialog';
import { t, getUserLanguage } from '@/i18n';

export default function PDFViewerPage() {
  const router = useRouter();
  const [pdfData, setPdfData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lang] = useState(getUserLanguage());

  useEffect(() => {
    // Load PDF data from sessionStorage or IndexedDB
    const loadPDFData = async () => {
      const storedPdfData = sessionStorage.getItem('explainer:pdfData');
      const storedFileName = sessionStorage.getItem('explainer:bookTitle');
      const pdfSource = sessionStorage.getItem('explainer:pdfSource');
      
      if (storedPdfData && pdfSource === 'sessionstorage') {
        // PDF is stored in sessionStorage
        setPdfData(storedPdfData);
        setFileName(storedFileName || 'PDF Document');
      } else if (pdfSource === 'indexeddb') {
        // PDF is stored in IndexedDB
        try {
          const pdfDataFromIndexedDB = await loadPDFFromIndexedDB();
          if (pdfDataFromIndexedDB) {
            setPdfData(pdfDataFromIndexedDB);
            setFileName(storedFileName || 'PDF Document');
          } else {
            throw new Error('PDF data not found in IndexedDB');
          }
        } catch (error) {
          console.error('Error loading PDF from IndexedDB:', error);
          router.push('/library');
          return;
        }
      } else {
        // No PDF data found, redirect to library
        router.push('/library');
        return;
      }
    };

    loadPDFData();
  }, [router]);

  // Helper function to load PDF from IndexedDB
  const loadPDFFromIndexedDB = async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ExplainerPDFs', 1);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['pdfs'], 'readonly');
        const store = transaction.objectStore('pdfs');
        const getRequest = store.get('current-pdf');
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(getRequest.result.data);
          } else {
            reject(new Error('PDF data not found in IndexedDB'));
          }
        };
        
        getRequest.onerror = () => reject(new Error('Failed to retrieve PDF from IndexedDB'));
      };
    });
  };

  const handleTextSelection = (selectedText, metadata) => {
    console.log('🔥 PDF Viewer Page: handleTextSelection called!', arguments);
    console.log('PDF Viewer Page: Received text selection:', `"${selectedText}"`);
    if (selectedText && selectedText.trim().length > 0) {
      const trimmedText = selectedText.trim();
      console.log('PDF Viewer Page: Trimmed text:', `"${trimmedText}"`);
      setPendingSelection({
        text: trimmedText,
        metadata
      });
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmExplanation = async () => {
    if (!pendingSelection) return;
    
    setIsLoading(true);
    setShowConfirmDialog(false);
    
    try {
      // Store the selected text and navigate to the main explainer
      localStorage.setItem('explainer:bookText', pendingSelection.text);
      localStorage.setItem('explainer:bookTitle', `${fileName} - Selected Text`);
      localStorage.setItem('explainer:selectionContext', JSON.stringify({
        source: 'pdf',
        originalFileName: fileName,
        page: pendingSelection.metadata?.page,
        coordinates: pendingSelection.metadata?.coordinates
      }));
      
      router.push('/home');
    } catch (error) {
      console.error('Error handling text selection:', error);
      setIsLoading(false);
    }
  };

  const handleBackToLibrary = () => {
    router.push('/library');
  };

  if (!pdfData) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>Loading PDF...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>PDF Viewer - {fileName}</title>
        <meta name="description" content="View and select text from PDF documents" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div style={{ 
        minHeight: '100vh', 
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleBackToLibrary}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                background: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.target.style.background = '#f9fafb'}
              onMouseOut={e => e.target.style.background = 'white'}
            >
              <ArrowLeft size={16} />
              Back to Library
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} style={{ color: '#3b82f6' }} />
              <span style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937',
                maxWidth: '400px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {fileName}
              </span>
            </div>
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            textAlign: 'center',
            maxWidth: '300px'
          }}>
            💡 Click on any text to get an explanation
          </div>
        </div>

        {/* PDF Viewer */}
        <div style={{ 
          flex: 1, 
          padding: '24px',
          overflow: 'hidden'
        }}>
          <PDFViewerNew
            pdfData={pdfData}
            fileName={fileName}
            onTextSelection={handleTextSelection}
            onLoadComplete={(info) => {
              console.log('PDF loaded successfully:', info);
            }}
            width="100%"
            height="100%"
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ExplanationConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingSelection(null);
        }}
        onConfirm={handleConfirmExplanation}
        selectedText={pendingSelection?.text || ''}
        isLoading={isLoading}
      />
    </>
  );
} 