import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link href="/">
              <span className="logo-text">Audionals</span>
              <span className="logo-icon">₿</span>
            </Link>
          </div>
          
          <nav className={`main-nav ${isMenuOpen ? 'active' : ''}`}>
            <ul className="nav-list">
              <li className="nav-item">
                <Link href="/" className="nav-link">Home</Link>
              </li>
              <li className="nav-item">
                <Link href="/about" className="nav-link">About</Link>
              </li>
              <li className="nav-item dropdown">
                <span className="nav-link dropdown-toggle">Technology</span>
                <ul className="dropdown-menu">
                  <li><Link href="/technology/protocol" className="dropdown-item">Protocol</Link></li>
                  <li><Link href="/technology/json-standard" className="dropdown-item">JSON Standard</Link></li>
                  <li><Link href="/technology/sequencer" className="dropdown-item">On-Chain Sequencer</Link></li>
                </ul>
              </li>
              <li className="nav-item dropdown">
                <span className="nav-link dropdown-toggle">Tools</span>
                <ul className="dropdown-menu">
                  <li><Link href="/tools/bitcoinbeats" className="dropdown-item">BitcoinBeats</Link></li>
                  <li><Link href="/tools/ordspd" className="dropdown-item">OrdSPD</Link></li>
                  <li><Link href="/tools/samples" className="dropdown-item">Sample Library</Link></li>
                </ul>
              </li>
              <li className="nav-item">
                <Link href="/learn" className="nav-link">Learn</Link>
              </li>
              <li className="nav-item">
                <Link href="/community" className="nav-link">Community</Link>
              </li>
              <li className="nav-item">
                <Link href="/developers" className="nav-link">Developers</Link>
              </li>
            </ul>
          </nav>
          
          <div className="header-actions">
            <Link href="/sequencer" className="btn btn-primary header-cta">Create Music</Link>
            <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
              <span className="menu-icon"></span>
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .site-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background-color: rgba(30, 30, 30, 0.95);
          backdrop-filter: blur(10px);
          z-index: 1000;
          padding: 1rem 0;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .logo {
          display: flex;
          align-items: center;
        }
        
        .logo a {
          display: flex;
          align-items: center;
          font-family: 'Montserrat', sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: var(--white);
        }
        
        .logo-icon {
          color: var(--bitcoin-orange);
          margin-left: 0.5rem;
        }
        
        .main-nav {
          display: flex;
        }
        
        .nav-list {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .nav-item {
          position: relative;
          margin: 0 1rem;
        }
        
        .nav-link {
          color: var(--light-gray);
          font-weight: 600;
          padding: 0.5rem 0;
          transition: color 0.3s ease;
        }
        
        .nav-link:hover {
          color: var(--bitcoin-orange);
        }
        
        .dropdown-toggle {
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        
        .dropdown-toggle::after {
          content: '▼';
          font-size: 0.7rem;
          margin-left: 0.5rem;
        }
        
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background-color: var(--dark-charcoal);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 0.5rem 0;
          min-width: 200px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          z-index: 100;
        }
        
        .dropdown:hover .dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        .dropdown-item {
          display: block;
          padding: 0.5rem 1rem;
          color: var(--light-gray);
          transition: all 0.3s ease;
        }
        
        .dropdown-item:hover {
          background-color: rgba(247, 147, 26, 0.1);
          color: var(--bitcoin-orange);
        }
        
        .header-actions {
          display: flex;
          align-items: center;
        }
        
        .header-cta {
          margin-right: 1rem;
        }
        
        .menu-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          width: 30px;
          height: 30px;
          position: relative;
        }
        
        .menu-icon,
        .menu-icon::before,
        .menu-icon::after {
          position: absolute;
          width: 30px;
          height: 3px;
          background-color: var(--white);
          transition: all 0.3s ease;
        }
        
        .menu-icon {
          top: 50%;
          transform: translateY(-50%);
        }
        
        .menu-icon::before,
        .menu-icon::after {
          content: '';
          left: 0;
        }
        
        .menu-icon::before {
          top: -8px;
        }
        
        .menu-icon::after {
          bottom: -8px;
        }
        
        @media (max-width: 1024px) {
          .main-nav {
            position: fixed;
            top: 70px;
            left: 0;
            width: 100%;
            height: calc(100vh - 70px);
            background-color: var(--dark-charcoal);
            flex-direction: column;
            padding: 2rem;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            overflow-y: auto;
          }
          
          .main-nav.active {
            transform: translateX(0);
          }
          
          .nav-list {
            flex-direction: column;
          }
          
          .nav-item {
            margin: 0.5rem 0;
          }
          
          .dropdown-menu {
            position: static;
            opacity: 1;
            visibility: visible;
            transform: none;
            background-color: transparent;
            border: none;
            box-shadow: none;
            padding-left: 1rem;
            display: none;
          }
          
          .dropdown.active .dropdown-menu {
            display: block;
          }
          
          .dropdown-toggle::after {
            margin-left: auto;
          }
          
          .menu-toggle {
            display: block;
          }
        }
      `}</style>
    </header>
  );
}
