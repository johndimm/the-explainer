import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { X, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import CreditsDisplay from '@/components/CreditsDisplay';

export default function Credits() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleClose = () => {
    router.back();
  };

  const handleBackToApp = () => {
    router.push('/home');
  };

  if (!session?.user?.email) {
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
        zIndex: 1000,
        color: '#18181b',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: 32,
          maxWidth: 500,
          width: '90%',
          position: 'relative',
          textAlign: 'center'
        }}>
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
            }}
          >
            <X size={20} />
          </button>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, color: '#1e293b' }}>
            Credits
          </h1>
          <p style={{ color: '#64748b', marginBottom: 24 }}>
            Please sign in to view and purchase credits.
          </p>
          <button
            onClick={handleBackToApp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={16} />
            Back to App
          </button>
        </div>
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
      zIndex: 1000,
      color: '#18181b',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: window.innerWidth <= 768 ? 16 : 32,
        maxWidth: window.innerWidth <= 768 ? '95vw' : 800,
        width: '100%',
        position: 'relative',
        maxHeight: window.innerWidth <= 768 ? '95vh' : '90vh',
        overflow: 'auto',
        margin: window.innerWidth <= 768 ? '10px' : '0'
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

        {/* Back to App link */}
        <button
          onClick={handleBackToApp}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
            padding: '8px 16px',
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            color: '#64748b',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.target.style.background = '#f8fafc';
            e.target.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={e => {
            e.target.style.background = 'none';
            e.target.style.borderColor = '#e2e8f0';
          }}
        >
          <ArrowLeft size={16} />
          Back to App
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, color: '#1e293b', paddingRight: 40 }}>
          💎 Credits
        </h1>
        
        {/* Credits Display Component */}
        <CreditsDisplay session={session} />
      </div>
    </div>
  );
}