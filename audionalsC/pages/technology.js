import Head from 'next/head';
import Link from 'next/link';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Technology() {
  return (
    <div className="technology-page">
      <Head>
        <title>Technology - Audionals</title>
        <meta name="description" content="Learn about the revolutionary technology behind Audionals, including the protocol, JSON standard, and on-chain sequencer." />
      </Head>
      
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="technology-hero blockchain-bg">
          <div className="container">
            <h1 className="fade-in">Audionals Technology</h1>
            <p className="hero-subtitle">
              Pioneering on-chain music production through innovative blockchain technology
            </p>
          </div>
        </section>
        
        {/* Overview Section */}
        <section className="overview-section section">
          <div className="container">
            <div className="grid">
              <div className="overview-content">
                <h2>Revolutionary Music Technology</h2>
                <p>
                  Audionals represents a paradigm shift in music production and rights management through three core technological innovations:
                </p>
                <ul className="technology-list">
                  <li>
                    <strong>The Audionals Protocol</strong> - A comprehensive framework for on-chain music production and rights management
                  </li>
                  <li>
                    <strong>JSON Standard</strong> - A unified format for storing audio and metadata on the Bitcoin blockchain
                  </li>
                  <li>
                    <strong>On-Chain Sequencer</strong> - A digital audio workstation that operates directly on the blockchain
                  </li>
                </ul>
                <p>
                  Together, these technologies create a complete ecosystem for creating, distributing, and managing music in a decentralized environment.
                </p>
              </div>
              <div className="overview-image">
                <div className="image-placeholder">
                  <span className="tech-icon">⚙️</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Protocol Section */}
        <section className="protocol-section section">
          <div className="container">
            <h2 className="section-title">The Audionals Protocol</h2>
            <div className="protocol-content">
              <div className="protocol-description">
                <p>
                  The Audionals protocol is a pioneering standard that transforms music production, distribution, and rights management by offering an on-chain digital audio workstation (DAW) built on the Bitcoin blockchain.
                </p>
                <p>
                  By fully operating within a decentralized on-chain environment, Audionals redefines Web3 music. This entirely on-chain approach guarantees that every facet of music creation, collaboration, and ownership is securely managed and transparently documented on the blockchain, creating an immutable and trustless ecosystem for artists and producers.
                </p>
                <h3>Key Features</h3>
                <div className="feature-grid">
                  <div className="protocol-feature">
                    <h4>True Web3 Composition</h4>
                    <p>Each song created with the Audionals protocol is a true Web3 composition, existing solely through programmatic assembly in a single-domain, on-chain environment.</p>
                  </div>
                  <div className="protocol-feature">
                    <h4>Revolutionary Rights Management</h4>
                    <p>Every element involved in a song's creation is owned and held within individual wallets, with the song file itself serving as an immutable Merkle tree that references each component's wallet address and rights holder.</p>
                  </div>
                  <div className="protocol-feature">
                    <h4>Embedded Rights Structure</h4>
                    <p>Audionals redefines how music is created, owned, and distributed by embedding rights directly into the song's digital structure, ensuring transparency and decentralized ownership.</p>
                  </div>
                  <div className="protocol-feature">
                    <h4>Comprehensive Attribution</h4>
                    <p>By integrating all elements of music production into the blockchain, the protocol ensures transparent attribution for every component used in creating a song.</p>
                  </div>
                </div>
              </div>
              <div className="protocol-cta">
                <Link href="/technology/protocol" className="btn btn-primary">Learn More About the Protocol</Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* JSON Standard Section */}
        <section className="json-section section blockchain-bg">
          <div className="container">
            <h2 className="section-title">JSON Standard</h2>
            <div className="json-content">
              <div className="json-description">
                <p>
                  The Audionals protocol introduces a comprehensive JSON structure for capturing every essential detail of a digital audio file, incorporating audio and exhaustive metadata into a single, on-chain playable file.
                </p>
                <div className="json-example">
                  <pre>
                    <code>
{`{
  "metadata": {
    "title": "Sample Audional",
    "creator": "Audionals User",
    "timestamp": 1679580000,
    "rights": {
      "owner": "bc1q..."
    }
  },
  "audio": {
    "format": "base64",
    "encoding": "UTF-8",
    "data": "UklGRiSAAABXQVZFZm10IBAAAA..."
  },
  "components": [
    {
      "type": "sample",
      "id": "ord:abc123",
      "owner": "bc1q..."
    }
  ]
}`}
                    </code>
                  </pre>
                </div>
                <h3>Technical Innovations</h3>
                <ul className="json-features">
                  <li>
                    <strong>Base64 Audio Integration</strong> - Eliminates the need for separate metadata files
                  </li>
                  <li>
                    <strong>Cross-Platform Compatibility</strong> - Ensures consistent experience across diverse platforms
                  </li>
                  <li>
                    <strong>Permanent Storage and Indexing</strong> - Establishes a new benchmark for audio file organization
                  </li>
                  <li>
                    <strong>Global Resource Library</strong> - Creates a transcendent library that preserves linguistic heritage
                  </li>
                </ul>
              </div>
              <div className="json-cta">
                <Link href="/technology/json-standard" className="btn btn-secondary">Explore the JSON Standard</Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* Sequencer Section */}
        <section className="sequencer-section section">
          <div className="container">
            <h2 className="section-title">On-Chain Sequencer</h2>
            <div className="sequencer-content">
              <div className="sequencer-description">
                <p>
                  The Audionals on-chain sequencer (BitcoinBeats/OrdSPD) is a sophisticated digital audio workstation that operates directly on the Bitcoin blockchain, allowing for the creation and manipulation of music in a decentralized environment.
                </p>
                <h3>Sequencer Capabilities</h3>
                <div className="capabilities-grid">
                  <div className="sequencer-capability">
                    <h4>Multi-Channel Sequencer</h4>
                    <p>Create complex compositions with multiple audio channels and samples</p>
                  </div>
                  <div className="sequencer-capability">
                    <h4>JSON-Based Storage</h4>
                    <p>Save compositions as JSON files that can be stored on the Bitcoin blockchain as Ordinals</p>
                  </div>
                  <div className="sequencer-capability">
                    <h4>Advanced Channel Controls</h4>
                    <p>Control volume, pitch, audio trimming, muting, and soloing for each channel</p>
                  </div>
                  <div className="sequencer-capability">
                    <h4>Pattern Manipulation</h4>
                    <p>Create and manipulate audio patterns with auto-draw and pattern shifting tools</p>
                  </div>
                </div>
                <p className="sequencer-note">
                  The sequencer is implemented as a web application that can be inscribed as an Ordinal on the Bitcoin blockchain, making it a "recursive inscription" - an application that exists on-chain and can create new on-chain content.
                </p>
              </div>
              <div className="sequencer-image">
                <div className="image-placeholder">
                  <span className="sequencer-icon">🎹</span>
                </div>
              </div>
              <div className="sequencer-cta">
                <Link href="/technology/sequencer" className="btn btn-primary">Discover the Sequencer</Link>
                <Link href="/tools/bitcoinbeats" className="btn btn-secondary">Try BitcoinBeats</Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="cta-section section">
          <div className="container">
            <h2 className="cta-title">Experience the Future of Music</h2>
            <p className="cta-description">
              Start creating on-chain music with Audionals today
            </p>
            <div className="cta-buttons">
              <Link href="/sequencer" className="btn btn-primary">Launch Sequencer</Link>
              <Link href="/learn" className="btn btn-secondary">View Tutorials</Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      
      <style jsx>{`
        .technology-hero {
          padding: 8rem 0 4rem;
          text-align: center;
          color: var(--white);
        }
        
        .hero-subtitle {
          font-size: 1.5rem;
          max-width: 800px;
          margin: 1.5rem auto 0;
        }
        
        .overview-section {
          padding: 5rem 0;
        }
        
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        
        .overview-content h2 {
          margin-bottom: 2rem;
        }
        
        .overview-content p {
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
          line-height: 1.8;
        }
        
        .technology-list {
          margin: 2rem 0;
          padding-left: 1.5rem;
        }
        
        .technology-list li {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        
        .overview-image {
          display: flex;
          justify-content: center;
        }
        
        .image-placeholder {
          width: 100%;
          max-width: 400px;
          aspect-ratio: 1;
          background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .tech-icon, .sequencer-icon {
          font-size: 5rem;
        }
        
        .protocol-section, .sequencer-section {
          padding: 5rem 0;
        }
        
        .json-section {
          padding: 5rem 0;
          color: var(--white);
        }
        
        .section-title {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .protocol-description, .json-description, .sequencer-description {
          margin-bottom: 3rem;
        }
        
        .protocol-description p, .json-description p, .sequencer-description p {
          margin-bottom: 1.5rem;
          line-height: 1.8;
        }
        
        .feature-grid, .capabilities-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
          margin: 2rem 0;
        }
        
        .protocol-feature h4, .sequencer-capability h4 {
          color: var(--bitcoin-orange);
          margin-bottom: 1rem;
        }
        
        .json-example {
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 1.5rem;
          margin: 2rem 0;
          overflow-x: auto;
        }
        
        .json-features {
          margin: 2rem 0;
          padding-left: 1.5rem;
        }
        
        .json-features li {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        
        .sequencer-note {
          font-style: italic;
          background-color: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 8px;
          margin: 2rem 0;
        }
        
        .sequencer-image {
          margin: 3rem 0;
          display: flex;
          justify-content: center;
        }
        
        .protocol-cta, .json-cta, .sequencer-cta {
          text-align: center;
        }
        
        .sequencer-cta {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        .cta-section {
          text-align: center;
          padding: 5rem 0;
          background-color: rgba(255, 255, 255, 0.02);
        }
        
        .cta-title {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        
        .cta-description {
          font-size: 1.2rem;
          max-width: 600px;
          margin: 0 auto 2rem;
        }
        
        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .overview-image {
            order: -1;
          }
          
          .feature-grid, .capabilities-grid {
            grid-template-columns: 1fr;
          }
          
          .sequencer-cta {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
