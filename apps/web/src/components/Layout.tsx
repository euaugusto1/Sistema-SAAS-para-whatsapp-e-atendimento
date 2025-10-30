import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { useAuth } from '../lib/auth/auth-context';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  hideSidebar?: boolean; // quando true, remove a barra lateral
}

export default function Layout({ children, title = 'WhatsApp SaaS', hideSidebar = false }: LayoutProps) {
  const router = useRouter();
  const auth: any = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '◆' },
    { name: 'Campanhas', href: '/campaigns', icon: '📢' },
    { name: 'Contatos', href: '/contacts', icon: '👥' },
    { name: 'WhatsApp', href: '/whatsapp', icon: '📱' },
    { name: 'Mensagens', href: '/messages', icon: '💬' },
    { name: 'Analytics', href: '/analytics', icon: '📊' },
    { name: 'Assinatura', href: '/plans', icon: '💳' },
  ];

  function logout() {
    try {
      auth.logout();
    } catch (e) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }

  return (
    <div className="layout-container">
      {/* Sidebar */}
      {!hideSidebar && (
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">⬢</span>
            <span className="logo-text">WhatsApp SaaS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${router.pathname === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <span className="nav-icon">◼</span>
            <span className="nav-text">Sair</span>
          </button>
        </div>
      </aside>
      )}

      {/* Main Content */}
      <main className={`main-content ${hideSidebar ? 'no-sidebar' : ''}`}>
        <div className="content-wrapper">
          {children}
        </div>
      </main>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        * {
          font-family: 'Poppins', sans-serif;
        }

        .layout-container {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #001a00 100%);
          animation: gradientShift 15s ease infinite;
        }

        @keyframes gradientShift {
          0%, 100% { 
            background: linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #001a00 100%); 
          }
          50% { 
            background: linear-gradient(135deg, #001a00 0%, #000000 50%, #0a0a0a 100%); 
          }
        }

        .sidebar {
          width: 260px;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(0, 255, 136, 0.2);
          box-shadow: 4px 0 24px rgba(0, 255, 136, 0.1);
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-header {
          padding: 2rem 1.5rem;
          border-bottom: 1px solid rgba(0, 255, 136, 0.15);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-icon {
          font-size: 2.5rem;
          color: #00ff88;
          filter: drop-shadow(0 0 12px rgba(0, 255, 136, 0.6));
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { 
            filter: drop-shadow(0 0 12px rgba(0, 255, 136, 0.6));
            transform: scale(1);
          }
          50% { 
            filter: drop-shadow(0 0 20px rgba(0, 255, 136, 0.8));
            transform: scale(1.05);
          }
        }

        .logo-text {
          font-size: 1.3rem;
          font-weight: 700;
          background: linear-gradient(90deg, #00ff88, #00cc66, #00ff88);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s ease-in-out infinite;
          letter-spacing: 0.5px;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow-y: auto;
        }

        .sidebar-nav::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-nav::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 136, 0.3);
          border-radius: 3px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 136, 0.5);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          background: none;
          border: 1px solid transparent;
          color: rgba(0, 255, 136, 0.6);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          width: 100%;
          position: relative;
          overflow: hidden;
          text-decoration: none;
          font-family: 'Poppins', sans-serif;
        }

        .nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 3px;
          height: 100%;
          background: linear-gradient(180deg, #00ff88, #00cc66);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .nav-item:hover::before {
          opacity: 1;
        }

        .nav-item::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.4s ease, height 0.4s ease;
        }

        .nav-item:hover::after {
          width: 300px;
          height: 300px;
        }

        .nav-item:hover {
          background: rgba(0, 255, 136, 0.05);
          border-color: rgba(0, 255, 136, 0.2);
          color: #00ff88;
          transform: translateX(8px);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.15);
        }

        .nav-item.active {
          background: rgba(0, 255, 136, 0.1);
          border-color: rgba(0, 255, 136, 0.4);
          color: #00ff88;
          box-shadow: 0 4px 20px rgba(0, 255, 136, 0.25);
        }

        .nav-item.active::before {
          opacity: 1;
        }

        .nav-icon {
          font-size: 0.8rem;
          min-width: 20px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 0 4px currentColor);
        }

        .nav-text {
          font-weight: 500;
          font-size: 0.95rem;
          position: relative;
          z-index: 1;
          letter-spacing: 0.3px;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(0, 255, 136, 0.15);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          background: rgba(255, 0, 0, 0.05);
          border: 1px solid rgba(255, 0, 0, 0.2);
          color: rgba(255, 68, 68, 0.8);
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .logout-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 0, 0, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.4s ease, height 0.4s ease;
        }

        .logout-btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .logout-btn:hover {
          background: rgba(255, 0, 0, 0.1);
          border-color: rgba(255, 0, 0, 0.4);
          color: #ff4444;
          transform: translateX(8px);
          box-shadow: 0 4px 20px rgba(255, 0, 0, 0.2);
        }

        .logout-btn .nav-icon {
          filter: drop-shadow(0 0 4px currentColor);
        }

        .logout-btn .nav-text {
          position: relative;
          z-index: 1;
        }

        .main-content {
          flex: 1;
          margin-left: 260px;
          min-height: 100vh;
        }
        .main-content.no-sidebar { margin-left: 0; }

        .content-wrapper {
          padding: 2rem;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .main-content { margin-left: 0; }

          .content-wrapper {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}