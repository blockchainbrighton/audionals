import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Tools() {
  const [activeTab, setActiveTab] = useState('bitcoinbeats');
  
  return (
    <div className="tools-page">
      <Head>
        <title>Music Production Tools - Audionals</title>
        <meta name="description" content="Explore Audionals' on-chain music production tools including BitcoinBeats Sequencer and OrdSPD for creating music directly on the Bitcoin blockchain." />
      </Head>
      
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="tools-hero blockchain-bg">
          <div className="container">
            <h1 className="fade-in">On-Chain Music Tools</h1>
            <p className="hero-subtitle">
              Create, mix, and produce music directly on the Bitcoin blockchain
            </p>
          </div>
        </section>
        
        {/* Tools Navigation */}
        <section className="tools-nav">
          <div className="container">
            <div className="tabs">
              <button 
                className={`tab-button ${activeTab === 'bitcoinbeats' ? 'active' : ''}`}
                onClick={() => setActiveTab('bitcoinbeats')}
              >
                BitcoinBeats Sequencer
              </button>
              <button 
                className={`tab-button ${activeTab === 'ordspd' ? 'active' : ''}`}
                onClick={() => setActiveTab('ordspd')}
              >
                OrdSPD
              </button>
              <button 
                className={`tab-button ${activeTab === 'samples' ? 'active' : ''}`}
                onClick={() => setActiveTab('samples')}
              >
                Sample Library
              </button>
            </div>
          </div>
        </section>
        
        {/* BitcoinBeats Section */}
        <section className={`tool-section ${activeTab === 'bitcoinbeats' ? 'active' : ''}`}>
          <div className="container">
            <div className="tool-content">
              <div className="tool-info">
                <h2>BitcoinBeats Sequencer</h2>
                <p className="tool-description">
                  The BitcoinBeats Sequencer is a full-featured digital audio workstation that operates directly on the Bitcoin blockchain. Create complex multi-channel compositions with our advanced on-chain sequencer.
                </p>
                <h3>Key Features</h3>
                <ul className="feature-list">
                  <li>Multi-channel sequencing with up to 16 tracks</li>
                  <li>Advanced channel controls for volume, pitch, and effects</li>
                  <li>Pattern creation and manipulation tools</li>
                  <li>Save compositions directly to the blockchain as Ordinals</li>
                  <li>Load and remix existing on-chain audio</li>
                  <li>Comprehensive project management</li>
                </ul>
                <div className="tool-cta">
                  <Link href="/tools/bitcoinbeats/launch" className="btn btn-primary">Launch BitcoinBeats</Link>
                  <Link href="/learn/tutorials/bitcoinbeats" className="btn btn-secondary">View Tutorial</Link>
                </div>
              </div>
              <div className="tool-preview">
                <div className="preview-placeholder">
                  <span className="tool-icon">🎹</span>
                  <p>BitcoinBeats Sequencer</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* OrdSPD Section */}
        <section className={`tool-section ${activeTab === 'ordspd' ? 'active' : ''}`}>
          <div className="container">
            <div className="tool-content">
              <div className="tool-info">
                <h2>OrdSPD (Ordinal Sample Pad Device)</h2>
                <p className="tool-description">
                  The OrdSPD is a regenerative Bitcoin Ordinal mixer for Audional Smart Samples. Create beat patterns and mix samples directly on the blockchain with this intuitive sample pad interface.
                </p>
                <h3>Key Features</h3>
                <ul className="feature-list">
                  <li>Grid-based sample pad interface</li>
                  <li>Load and trigger Bitcoin Ordinal audio samples</li>
                  <li>Adjust global BPM and individual sample parameters</li>
                  <li>Create randomized mixes with a single click</li>
                  <li>Save and share your creations as Ordinals</li>
                  <li>Hotkeys and shortcuts for efficient workflow</li>
                </ul>
                <div className="tool-cta">
                  <Link href="/tools/ordspd/launch" className="btn btn-primary">Launch OrdSPD</Link>
                  <Link href="/learn/tutorials/ordspd" className="btn btn-secondary">View Tutorial</Link>
                </div>
              </div>
              <div className="tool-preview">
                <div className="preview-placeholder">
                  <span className="tool-icon">🎛️</span>
                  <p>Ordinal Sample Pad Device</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Sample Library Section */}
        <section className={`tool-section ${activeTab === 'samples' ? 'active' : ''}`}>
          <div className="container">
            <div className="tool-content">
              <div className="tool-info">
                <h2>On-Chain Sample Library</h2>
                <p className="tool-description">
                  Explore our growing collection of on-chain audio samples inscribed as Bitcoin Ordinals. Browse, preview, and use these samples in your own compositions with our sequencer tools.
                </p>
                <h3>Library Features</h3>
                <ul className="feature-list">
                  <li>Curated collection of high-quality audio samples</li>
                  <li>All samples inscribed as Bitcoin Ordinals</li>
                  <li>Categories including drums, bass, synths, and effects</li>
                  <li>Preview samples before using in your compositions</li>
                  <li>Direct integration with BitcoinBeats and OrdSPD</li>
                  <li>Community-contributed samples</li>
                </ul>
                <div className="tool-cta">
                  <Link href="/tools/samples/browse" className="btn btn-primary">Browse Samples</Link>
                  <Link href="/learn/tutorials/samples" className="btn btn-secondary">Learn More</Link>
                </div>
              </div>
              <div className="sample-preview">
                <div className="sample-grid">
                  {[1, 2, 3, 4, 5, 6].map((index) => (
                    <div key={index} className="sample-item">
                      <div className="sample-icon">♪</div>
                      <div className="sample-name">Sample {index}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Integration Section */}
        <section className="integration-section section">
          <div className="container">
            <h2 className="section-title">Seamless Integration</h2>
            <p className="section-description">
              All Audionals tools work together in a unified ecosystem, allowing you to create, mix, and produce music entirely on the Bitcoin blockchain.
            </p>
            <div className="integration-diagram">
              <div className="diagram-node bitcoinbeats-node">
                <div className="node-icon">🎹</div>
                <div className="node-label">BitcoinBeats</div>
              </div>
              <div className="diagram-connector"></div>
              <div className="diagram-node blockchain-node">
                <div className="node-icon">₿</div>
                <div className="node-label">Bitcoin Blockchain</div>
              </div>
              <div className="diagram-connector"></div>
              <div className="diagram-node ordspd-node">
                <div className="node-icon">🎛️</div>
                <div className="node-label">OrdSPD</div>
              </div>
              <div className="diagram-connector vertical"></div>
              <div className="diagram-node samples-node">
                <div className="node-icon">♪</div>
                <div className="node-label">Sample Library</div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="cta-section section blockchain-bg">
          <div className="container">
            <h2 className="cta-title">Start Creating Today</h2>
            <p className="cta-description">
              Join the revolution in on-chain music production
            </p>
            <div className="cta-buttons">
              <Link href="/tools/bitcoinbeats/launch" className="btn btn-primary">Launch Sequencer</Link>
              <Link href="/community" className="btn btn-secondary">Join Community</Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      
      <style jsx>{`
        .tools-hero {
          padding: 8rem 0 4rem;
          text-align: center;
          color: var(--white);
        }
        
        .hero-subtitle {
          font-size: 1.5rem;
          max-width: 800px;
          margin: 1.5rem auto 0;
        }
        
        .tools-nav {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1rem 0;
          position: sticky;
          top: 70px;
          z-index: 100;
        }
        
        .tabs {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }
        
        .tab-button {
          background: none;
          border: none;
          color: var(--light-gray);
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }
        
        .tab-button:hover {
          color: var(--white);
        }
        
        .tab-button.active {
          color: var(--bitcoin-orange);
          border-bottom-color: var(--bitcoin-orange);
        }
        
        .tool-section {
          padding: 4rem 0;
          display: none;
        }
        
        .tool-section.active {
          display: block;
        }
        
        .tool-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        
        .tool-info h2 {
          margin-bottom: 1.5rem;
        }
        
        .tool-description {
          font-size: 1.1rem;
          line-height: 1.8;
          margin-bottom: 2rem;
        }
        
        .feature-list {
          margin: 2rem 0;
          padding-left: 1.5rem;
        }
        
        .feature-list li {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        
        .tool-cta {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .tool-preview, .preview-placeholder {
          width: 100%;
          aspect-ratio: 16/9;
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .tool-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        
        .sample-preview {
          width: 100%;
        }
        
        .sample-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        
        .sample-item {
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          transition: transform 0.3s ease;
          cursor: pointer;
        }
        
        .sample-item:hover {
          transform: translateY(-5px);
          background-color: rgba(247, 147, 26, 0.1);
        }
        
        .sample-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: var(--bitcoin-orange);
        }
        
        .integration-section {
          padding: 5rem 0;
          background-color: rgba(255, 255, 255, 0.02);
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
        
        .integration-diagram {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }
        
        .diagram-node {
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          min-width: 150px;
        }
        
        .node-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        
        .node-label {
          font-weight: 600;
        }
        
        .bitcoinbeats-node .node-icon,
        .ordspd-node .node-icon {
          color: var(--electric-purple);
        }
        
        .blockchain-node .node-icon {
          color: var(--bitcoin-orange);
        }
        
        .samples-node .node-icon {
          color: var(--deep-blue);
        }
        
        .diagram-connector {
          height: 2px;
          width: 50px;
          background-color: var(--bitcoin-orange);
        }
        
        .diagram-connector.vertical {
          height: 50px;
          width: 2px;
        }
        
        .cta-section {
          text-align: center;
          padding: 5rem 0;
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
          .tabs {
            flex-direction: column;
            align-items: center;
          }
          
          .tool-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .tool-preview {
            order: -1;
          }
          
          .tool-cta {
            flex-direction: column;
          }
          
          .sample-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .integration-diagram {
            flex-direction: column;
          }
          
          .diagram-connector {
            transform: rotate(90deg);
          }
          
          .diagram-connector.vertical {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
