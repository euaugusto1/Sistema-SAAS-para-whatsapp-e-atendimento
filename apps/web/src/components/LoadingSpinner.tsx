import React from 'react';

export function LoadingSpinner({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      padding: '2rem'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '3px solid rgba(0, 255, 136, 0.1)',
        borderTop: '3px solid #00ff88',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{
        marginTop: '1rem',
        color: '#00ff88',
        fontSize: '1rem',
        fontWeight: '300'
      }}>{message}</p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{
      background: 'rgba(255, 0, 0, 0.1)',
      border: '1px solid rgba(255, 0, 0, 0.3)',
      borderRadius: '16px',
      padding: '1.5rem',
      margin: '2rem 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: '#ff4444'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button 
          onClick={onRetry}
          style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid #00ff88',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: '#00ff88',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#00ff88';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 255, 136, 0.1)';
            e.currentTarget.style.color = '#00ff88';
          }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
