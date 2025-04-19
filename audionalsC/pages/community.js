import Head from 'next/head';
import Link from 'next/link';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Community() {
  return (
    <div className="community-page">
      <Head>
        <title>Community - Audionals</title>
        <meta name="description" content="Join the Audionals community of musicians, developers, and enthusiasts creating on-chain music on the Bitcoin blockchain." />
      </Head>
      
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="community-hero blockchain-bg">
          <div className="container">
            <h1 className="fade-in">Join Our Community</h1>
            <p className="hero-subtitle">
              Connect with musicians, developers, and enthusiasts shaping the future of on-chain music
            </p>
          </div>
        </section>
        
        {/* Showcase Section */}
        <section className="showcase-section section">
          <div className="container">
            <h2 className="section-title">Community Showcase</h2>
            <p className="section-description">
              Explore amazing compositions created by the Audionals community
            </p>
            <div className="showcase-grid">
              <div className="showcase-item">
                <div className="showcase-image">
                  <div className="image-placeholder">
                    <span className="showcase-icon">♪</span>
                  </div>
                  <button className="play-button">
                    <span className="play-icon">▶</span>
                  </button>
                </div>
                <div className="showcase-content">
                  <h3 className="showcase-title">Blockchain Symphony</h3>
                  <p className="showcase-creator">by CryptoComposer</p>
                  <p className="showcase-description">
                    A mesmerizing composition that blends electronic beats with classical influences, created entirely on-chain.
                  </p>
                </div>
              </div>
              
              <div className="showcase-item">
                <div className="showcase-image">
                  <div className="image-placeholder">
                    <span className="showcase-icon">♪</span>
                  </div>
                  <button className="play-button">
                    <span className="play-icon">▶</span>
                  </button>
                </div>
                <div className="showcase-content">
                  <h3 className="showcase-title">Satoshi's Groove</h3>
                  <p className="showcase-creator">by BitcoinBeat</p>
                  <p className="showcase-description">
                    An energetic dance track with pulsating rhythms and innovative sound design using Bitcoin Ordinals.
                  </p>
                </div>
              </div>
              
              <div className="showcase-item">
                <div className="showcase-image">
                  <div className="image-placeholder">
                    <span className="showcase-icon">♪</span>
                  </div>
                  <button className="play-button">
                    <span className="play-icon">▶</span>
                  </button>
                </div>
                <div className="showcase-content">
                  <h3 className="showcase-title">Ordinal Ambience</h3>
                  <p className="showcase-creator">by ChainArtist</p>
                  <p className="showcase-description">
                    A soothing ambient piece that demonstrates the expressive capabilities of the Audionals protocol.
                  </p>
                </div>
              </div>
            </div>
            <div className="showcase-cta">
              <Link href="/community/showcase" className="btn btn-primary">View All Compositions</Link>
              <Link href="/community/submit" className="btn btn-secondary">Submit Your Creation</Link>
            </div>
          </div>
        </section>
        
        {/* Community Platforms Section */}
        <section className="platforms-section section blockchain-bg">
          <div className="container">
            <h2 className="section-title">Connect With Us</h2>
            <p className="section-description">
              Join our community platforms to connect, collaborate, and stay updated
            </p>
            <div className="platforms-grid">
              <div className="platform-card">
                <div className="platform-icon">
                  <span className="icon-placeholder">Discord</span>
                </div>
                <h3 className="platform-title">Discord</h3>
                <p className="platform-description">
                  Join our Discord server to connect with other Audionals users, share your creations, get help, and participate in community events.
                </p>
                <a href="https://discord.gg/UR73BxmDmM" className="btn btn-primary" target="_blank" rel="noopener noreferrer">Join Discord</a>
              </div>
              
              <div className="platform-card">
                <div className="platform-icon">
                  <span className="icon-placeholder">Twitter</span>
                </div>
                <h3 className="platform-title">Twitter</h3>
                <p className="platform-description">
                  Follow us on Twitter for the latest news, updates, and community highlights. Join the conversation about on-chain music production.
                </p>
                <a href="https://x.com/audionals" className="btn btn-primary" target="_blank" rel="noopener noreferrer">Follow @audionals</a>
              </div>
              
              <div className="platform-card">
                <div className="platform-icon">
                  <span className="icon-placeholder">GitHub</span>
                </div>
                <h3 className="platform-title">GitHub</h3>
                <p className="platform-description">
                  Explore our open-source repositories, contribute to the development of Audionals tools, and help shape the future of the protocol.
                </p>
                <a href="https://github.com/audionals" className="btn btn-primary" target="_blank" rel="noopener noreferrer">View GitHub</a>
              </div>
            </div>
          </div>
        </section>
        
        {/* Community Events Section */}
        <section className="events-section section">
          <div className="container">
            <h2 className="section-title">Community Events</h2>
            <p className="section-description">
              Participate in virtual events, workshops, and hackathons
            </p>
            <div className="events-list">
              <div className="event-card">
                <div className="event-date">
                  <span className="event-month">APR</span>
                  <span className="event-day">15</span>
                </div>
                <div className="event-details">
                  <h3 className="event-title">Audionals Workshop: Creating Your First On-Chain Composition</h3>
                  <p className="event-description">
                    Join us for a hands-on workshop where you'll learn how to create your first composition using the BitcoinBeats sequencer.
                  </p>
                  <div className="event-meta">
                    <span className="event-time">2:00 PM UTC</span>
                    <span className="event-location">Discord</span>
                  </div>
                  <a href="#" className="event-link">Register Now</a>
                </div>
              </div>
              
              <div className="event-card">
                <div className="event-date">
                  <span className="event-month">MAY</span>
                  <span className="event-day">10</span>
                </div>
                <div className="event-details">
                  <h3 className="event-title">Audionals Hackathon: Building with the Protocol</h3>
                  <p className="event-description">
                    A virtual hackathon for developers to build innovative applications using the Audionals protocol and JSON standard.
                  </p>
                  <div className="event-meta">
                    <span className="event-time">All Day</span>
                    <span className="event-location">Online</span>
                  </div>
                  <a href="#" className="event-link">Learn More</a>
                </div>
              </div>
              
              <div className="event-card">
                <div className="event-date">
                  <span className="event-month">JUN</span>
                  <span className="event-day">05</span>
                </div>
                <div className="event-details">
                  <h3 className="event-title">Community Listening Party</h3>
                  <p className="event-description">
                    Join us for a virtual listening party featuring the best community-created Audionals compositions.
                  </p>
                  <div className="event-meta">
                    <span className="event-time">7:00 PM UTC</span>
                    <span className="event-location">Discord</span>
                  </div>
                  <a href="#" className="event-link">Add to Calendar</a>
                </div>
              </div>
            </div>
            <div className="events-cta">
              <Link href="/community/events" className="btn btn-secondary">View All Events</Link>
            </div>
          </div>
        </section>
        
        {/* Community Guidelines Section */}
        <section className="guidelines-section section">
          <div className="container">
            <h2 className="section-title">Community Guidelines</h2>
            <div className="guidelines-content">
              <p>
                The Audionals community is built on principles of creativity, collaboration, and respect. We're committed to fostering an inclusive environment where all members feel welcome and valued.
              </p>
              <h3>Our Core Values</h3>
              <div className="values-grid">
                <div className="value-item">
                  <div className="value-icon">🎵</div>
                  <h4 className="value-title">Creative Expression</h4>
                  <p className="value-description">
                    We celebrate artistic expression and innovation in on-chain music production.
                  </p>
                </div>
                
                <div className="value-item">
                  <div className="value-icon">🤝</div>
                  <h4 className="value-title">Collaboration</h4>
                  <p className="value-description">
                    We encourage collaboration between musicians, developers, and enthusiasts.
                  </p>
                </div>
                
                <div className="value-item">
                  <div className="value-icon">🌍</div>
                  <h4 className="value-title">Inclusivity</h4>
                  <p className="value-description">
                    We welcome members from all backgrounds, experiences, and skill levels.
                  </p>
                </div>
                
                <div className="value-item">
                  <div className="value-icon">💡</div>
                  <h4 className="value-title">Knowledge Sharing</h4>
                  <p className="value-description">
                    We value the open exchange of ideas, techniques, and learning resources.
                  </p>
                </div>
              </div>
              <div className="guidelines-cta">
                <Link href="/community/guidelines" className="btn btn-secondary">Read Full Guidelines</Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* Join CTA Section */}
        <section className="join-cta-section section blockchain-bg">
          <div className="container">
            <h2 className="cta-title">Ready to Join the Revolution?</h2>
            <p className="cta-description">
              Become part of the community that's redefining music production on the blockchain
            </p>
            <div className="cta-buttons">
              <a href="https://discord.gg/UR73BxmDmM" className="btn btn-primary" target="_blank" rel="noopener noreferrer">Join Discord</a>
              <Link href="/sequencer" className="btn btn-secondary">Try the Sequencer</Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      
      <style jsx>{`
        .community-hero {
          padding: 8rem 0 4rem;
          text-align: center;
          color: var(--white);
        }
        
        .hero-subtitle {
          font-size: 1.5rem;
          max-width: 800px;
          margin: 1.5rem auto 0;
        }
        
        .section {
          padding: 5rem 0;
        }
        
        .section-title {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        .section-description {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 3rem;
          font-size: 1.1rem;
          line-height: 1.8;
        }
        
        .showcase-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-bottom: 3rem;
        }
        
        .showcase-item {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .showcase-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .showcase-image {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
        }
        
        .image-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .showcase-icon {
          font-size: 3rem;
          color: var(--bitcoin-orange);
        }
        
        .play-button {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          background-color: rgba(247, 147, 26, 0.8);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.3s ease, transform 0.3s ease;
        }
        
        .play-button:hover {
          background-color: var(--bitcoin-orange);
          transform: translate(-50%, -50%) scale(1.1);
        }
        
        .play-icon {
          color: white;
          font-size: 1.5rem;
        }
        
        .showcase-content {
          padding: 1.5rem;
        }
        
        .showcase-title {
          font-size: 1.3rem;
          margin-bottom: 0.5rem;
        }
        
        .showcase-creator {
          color: var(--bitcoin-orange);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        
        .showcase-description {
          color: var(--light-gray);
          line-height: 1.6;
        }
        
        .showcase-cta {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        .platforms-section {
          color: var(--white);
        }
        `}</style> {/* <= Add this closing backtick, brace, and tag */}
        </div> // <= Make sure this closing div for the main wrapper is present
      ); // <= Add this closing parenthesis for the return statement
    } // <= Add this closing curly brace for the Community function