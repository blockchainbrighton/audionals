import Head from 'next/head';
import Link from 'next/link';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Developers() {
  return (
    <div className="developers-page">
      <Head>
        <title>Developer Hub - Audionals</title>
        <meta name="description" content="Resources for developers to build with the Audionals protocol, including API documentation, integration guides, and code examples." />
      </Head>
      
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="developers-hero blockchain-bg">
          <div className="container">
            <h1 className="fade-in">Developer Hub</h1>
            <p className="hero-subtitle">
              Build the future of on-chain music with the Audionals protocol
            </p>
          </div>
        </section>
        
        {/* Overview Section */}
        <section className="overview-section section">
          <div className="container">
            <div className="grid">
              <div className="overview-content">
                <h2>Build With Audionals</h2>
                <p>
                  The Audionals protocol provides a powerful foundation for creating applications that leverage on-chain music production and rights management on the Bitcoin blockchain.
                </p>
                <p>
                  Whether you're building a music application, integrating with existing platforms, or exploring new use cases for on-chain audio, our developer resources will help you get started.
                </p>
                <div className="overview-cta">
                  <Link href="/developers/getting-started" className="btn btn-primary">Get Started</Link>
                  <Link href="/developers/documentation" className="btn btn-secondary">View Documentation</Link>
                </div>
              </div>
              <div className="overview-image">
                <div className="image-placeholder">
                  <span className="dev-icon">{"</>"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* API Documentation Section */}
        <section className="api-section section blockchain-bg">
          <div className="container">
            <h2 className="section-title">API Documentation</h2>
            <p className="section-description">
              Comprehensive documentation for the Audionals API
            </p>
            <div className="api-content">
              <div className="api-overview">
                <h3>API Overview</h3>
                <p>
                  The Audionals API allows developers to interact with the protocol, access on-chain audio data, and integrate with the BitcoinBeats sequencer and OrdSPD tools.
                </p>
                <div className="api-features">
                  <div className="api-feature">
                    <h4>Audio Data Access</h4>
                    <p>Retrieve and manipulate on-chain audio data stored as Bitcoin Ordinals</p>
                  </div>
                  <div className="api-feature">
                    <h4>Composition Management</h4>
                    <p>Create, read, update, and delete on-chain music compositions</p>
                  </div>
                  <div className="api-feature">
                    <h4>Rights Management</h4>
                    <p>Access and verify rights information for audio components</p>
                  </div>
                  <div className="api-feature">
                    <h4>Sequencer Integration</h4>
                    <p>Integrate with the BitcoinBeats sequencer and OrdSPD tools</p>
                  </div>
                </div>
              </div>
              <div className="api-example">
                <h3>Example Request</h3>
                <pre>
                  <code>
{`// Fetch an Audional composition by ID
fetch('https://api.audionals.com/v1/compositions/abc123')
  .then(response => response.json())
  .then(data => {
    console.log(data);
    // Process the composition data
  })
  .catch(error => console.error('Error:', error));`}
                  </code>
                </pre>
                <h3>Example Response</h3>
                <pre>
                  <code>
{`{
  "id": "abc123",
  "title": "Sample Composition",
  "creator": "0xabc...",
  "timestamp": 1679580000,
  "components": [
    {
      "type": "sample",
      "id": "ord:def456",
      "owner": "0xdef..."
    },
    {
      "type": "pattern",
      "id": "ord:ghi789",
      "owner": "0xghi..."
    }
  ],
  "metadata": {
    // Additional metadata
  }
}`}
                  </code>
                </pre>
              </div>
            </div>
            <div className="api-cta">
              <Link href="/developers/api" className="btn btn-secondary">Full API Documentation</Link>
            </div>
          </div>
        </section>
        
        {/* Integration Guides Section */}
        <section className="guides-section section">
          <div className="container">
            <h2 className="section-title">Integration Guides</h2>
            <p className="section-description">
              Step-by-step guides for integrating with the Audionals protocol
            </p>
            <div className="guides-grid">
              <div className="guide-card">
                <div className="guide-icon">🔌</div>
                <h3 className="guide-title">Basic Integration</h3>
                <p className="guide-description">
                  Learn how to set up basic integration with the Audionals protocol, including authentication and API access.
                </p>
                <Link href="/developers/guides/basic-integration" className="guide-link">View Guide</Link>
              </div>
              
              <div className="guide-card">
                <div className="guide-icon">🎵</div>
                <h3 className="guide-title">Working with Audio Data</h3>
                <p className="guide-description">
                  Understand how to retrieve, manipulate, and store on-chain audio data using the Audionals JSON format.
                </p>
                <Link href="/developers/guides/audio-data" className="guide-link">View Guide</Link>
              </div>
              
              <div className="guide-card">
                <div className="guide-icon">🔐</div>
                <h3 className="guide-title">Rights Management</h3>
                <p className="guide-description">
                  Implement rights management features using the Audionals protocol's embedded rights structure.
                </p>
                <Link href="/developers/guides/rights-management" className="guide-link">View Guide</Link>
              </div>
              
              <div className="guide-card">
                <div className="guide-icon">🧩</div>
                <h3 className="guide-title">Sequencer Integration</h3>
                <p className="guide-description">
                  Integrate the BitcoinBeats sequencer or OrdSPD into your application for on-chain music creation.
                </p>
                <Link href="/developers/guides/sequencer-integration" className="guide-link">View Guide</Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* SDK Section */}
        <section className="sdk-section section blockchain-bg">
          <div className="container">
            <h2 className="section-title">Audionals SDK</h2>
            <p className="section-description">
              Official software development kits for building with Audionals
            </p>
            <div className="sdk-content">
              <div className="sdk-info">
                <p>
                  The Audionals SDK provides a set of tools and libraries for integrating with the Audionals protocol in various programming languages and environments.
                </p>
                <h3>Available SDKs</h3>
                <ul className="sdk-list">
                  <li>
                    <strong>JavaScript/TypeScript SDK</strong> - For web applications and Node.js
                  </li>
                  <li>
                    <strong>Python SDK</strong> - For data analysis and backend applications
                  </li>
                  <li>
                    <strong>React Components</strong> - UI components for React applications
                  </li>
                </ul>
                <h3>Key Features</h3>
                <ul className="feature-list">
                  <li>Simple API for interacting with the Audionals protocol</li>
                  <li>Audio data manipulation utilities</li>
                  <li>Rights management helpers</li>
                  <li>Sequencer integration components</li>
                  <li>TypeScript definitions for type safety</li>
                </ul>
              </div>
              <div className="sdk-example">
                <h3>Example Usage</h3>
                <pre>
                  <code>
{`// JavaScript/TypeScript SDK Example
import { Audionals, Composition } from '@audionals/sdk';

// Initialize the SDK
const audionals = new Audionals({
  apiKey: 'your-api-key'
});

// Create a new composition
const composition = new Composition({
  title: 'My Composition',
  bpm: 120
});

// Add a sample to the composition
composition.addSample({
  ordinalId: 'ord:abc123',
  channel: 0,
  pattern: [1, 0, 0, 0, 1, 0, 0, 0]
});

// Save the composition
audionals.saveComposition(composition)
  .then(result => {
    console.log('Saved composition:', result.id);
  })
  .catch(error => {
    console.error('Error saving composition:', error);
  });`}
                  </code>
                </pre>
              </div>
            </div>
            <div className="sdk-cta">
              <Link href="/developers/sdk" className="btn btn-secondary">SDK Documentation</Link>
              <a href="https://github.com/audionals/sdk" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
            </div>
          </div>
        </section>
        
        {/* Community Section */}
        <section className="dev-community-section section">
          <div className="container">
            <h2 className="section-title">Developer Community</h2>
            <p className="section-description">
              Connect with other developers building with Audionals
            </p>
            <div className="community-options">
              <div className="community-option">
                <div className="option-icon">💬</div>
                <h3 className="option-title">Discord</h3>
                <p className="option-description">
                  Join the #developers channel in our Discord server to ask questions, share your projects, and collaborate with other developers.
                </p>
                <a href="https://discord.gg/UR73BxmDmM" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Join Discord</a>
              </div>
              
              <div className="community-option">
                <div className="option-icon">🐙</div>
                <h3 className="option-title">GitHub</h3>
                <p className="option-description">
                  Contribute to our open-source repositories, report issues, and submit pull requests to help improve the Audionals ecosystem.
                </p>
                <a href="https://github.com/audionals" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">View GitHub</a>
              </div>
              
              <div className="community-option">
                <div className="option-icon">📝</div>
                <h3 className="option-title">Developer Blog</h3>
                <p className="option-description">
                  Read technical articles, tutorials, and case studies from the Audionals team and community contributors.
                </p>
                <Link href="/developers/blog" className="btn btn-secondary">Read Blog</Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="cta-section section blockchain-bg">
          <div className="container">
            <h2 className="cta-title">Start Building Today</h2>
            <p className="cta-description">
              Join the revolution in on-chain music production
            </p>
            <div className="cta-buttons">
              <Link href="/developers/getting-started" className="btn btn-primary">Get Started</Link>
              <a href="https://github.com/audionals" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">View on GitHub</a>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      
      <style jsx>{`
        .developers-hero {
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
        
        .overview-cta {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
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
        
        .dev-icon {
          font-size: 4rem;
          color: var(--bitcoin-orange);
        }
        
        .api-section {
          color: var(--white);
        }
        
        .api-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          margin-bottom: 3rem;
        }
        
        .api-overview h3, .api-example h3 {
          margin-bottom: 1.5rem;
        }
        
        .api-overview p {
          margin-bottom: 2rem;
          line-height: 1.8;
        }
        
        .api-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        
        .api-feature h4 {
          color: var(--bitcoin-orange);
          margin-bottom: 0.5rem;
        }
        
        .api-feature p {
          margin-bottom: 0;
          font-size: 0.9rem;
        }
        
        .api-example pre {
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          overflow-x: auto;
        }
        
        .api-cta {
          text-align: center;
        }
        
        .guides-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
        }
        
        .guide-card {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 2r;
        }
        `}</style> {/* <= Add this closing backtick, brace, and tag */}
        </div> // <= Make sure this closing div for the main wrapper is present
      ); // <= Add this closing parenthesis for the return statement
    } // <= Add this closing curly brace for the Community function