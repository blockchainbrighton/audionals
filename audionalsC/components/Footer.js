import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <Link href="/">
              <span className="logo-text">Audionals</span>
              <span className="logo-icon">₿</span>
            </Link>
            <p className="footer-tagline">Revolutionizing music production on the Bitcoin blockchain</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h3 className="footer-heading">Explore</h3>
              <ul className="footer-list">
                <li><Link href="/" className="footer-link">Home</Link></li>
                <li><Link href="/about" className="footer-link">About</Link></li>
                <li><Link href="/technology" className="footer-link">Technology</Link></li>
                <li><Link href="/tools" className="footer-link">Tools</Link></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3 className="footer-heading">Resources</h3>
              <ul className="footer-list">
                <li><Link href="/learn" className="footer-link">Tutorials</Link></li>
                <li><Link href="/learn/documentation" className="footer-link">Documentation</Link></li>
                <li><Link href="/learn/faq" className="footer-link">FAQs</Link></li>
                <li><Link href="/developers" className="footer-link">Developer Hub</Link></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3 className="footer-heading">Community</h3>
              <ul className="footer-list">
                <li><Link href="/community" className="footer-link">Showcase</Link></li>
                <li><a href="https://discord.gg/UR73BxmDmM" className="footer-link" target="_blank" rel="noopener noreferrer">Discord</a></li>
                <li><a href="https://x.com/audionals" className="footer-link" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                <li><Link href="/support" className="footer-link">Support</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-newsletter">
            <h3 className="footer-heading">Stay Updated</h3>
            <p>Subscribe to our newsletter for the latest updates on Audionals.</p>
            <form className="newsletter-form">
              <input type="email" placeholder="Your email address" className="newsletter-input" />
              <button type="submit" className="btn btn-primary newsletter-button">Subscribe</button>
            </form>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="copyright">&copy; {new Date().getFullYear()} Audionals. All rights reserved.</p>
          <div className="footer-legal">
            <Link href="/privacy" className="legal-link">Privacy Policy</Link>
            <Link href="/terms" className="legal-link">Terms of Service</Link>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .site-footer {
          background-color: #121212;
          padding: 4rem 0 2rem;
          margin-top: 4rem;
        }
        
        .footer-content {
          display: grid;
          grid-template-columns: 1.5fr repeat(3, 1fr);
          gap: 2rem;
          margin-bottom: 3rem;
        }
        
        .footer-logo a {
          display: flex;
          align-items: center;
          font-family: 'Montserrat', sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: var(--white);
          margin-bottom: 1rem;
        }
        
        .logo-icon {
          color: var(--bitcoin-orange);
          margin-left: 0.5rem;
        }
        
        .footer-tagline {
          color: var(--light-gray);
          max-width: 300px;
        }
        
        .footer-heading {
          color: var(--white);
          font-size: 1.2rem;
          margin-bottom: 1.5rem;
        }
        
        .footer-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .footer-list li {
          margin-bottom: 0.75rem;
        }
        
        .footer-link {
          color: var(--light-gray);
          transition: color 0.3s ease;
        }
        
        .footer-link:hover {
          color: var(--bitcoin-orange);
        }
        
        .newsletter-form {
          display: flex;
          margin-top: 1rem;
        }
        
        .newsletter-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--white);
          border-radius: 4px 0 0 4px;
        }
        
        .newsletter-button {
          border-radius: 0 4px 4px 0;
        }
        
        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .copyright {
          color: var(--light-gray);
        }
        
        .footer-legal {
          display: flex;
        }
        
        .legal-link {
          color: var(--light-gray);
          margin-left: 1.5rem;
          transition: color 0.3s ease;
        }
        
        .legal-link:hover {
          color: var(--bitcoin-orange);
        }
        
        @media (max-width: 1024px) {
          .footer-content {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .footer-logo {
            grid-column: 1 / -1;
            margin-bottom: 2rem;
          }
        }
        
        @media (max-width: 768px) {
          .footer-content {
            grid-template-columns: 1fr;
          }
          
          .footer-bottom {
            flex-direction: column;
            text-align: center;
          }
          
          .footer-legal {
            margin-top: 1rem;
          }
          
          .legal-link:first-child {
            margin-left: 0;
          }
        }
      `}</style>
    </footer>
  );
}
