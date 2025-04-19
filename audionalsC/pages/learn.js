import Head from 'next/head';
import Link from 'next/link';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Learn() {
  return (
    <div className="learn-page">
      <Head>
        <title>Learn - Audionals</title>
        <meta name="description" content="Learn how to use Audionals tools for on-chain music production with tutorials, documentation, and FAQs." />
      </Head>
      
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="learn-hero blockchain-bg">
          <div className="container">
            <h1 className="fade-in">Learn Audionals</h1>
            <p className="hero-subtitle">
              Master on-chain music production with our comprehensive learning resources
            </p>
          </div>
        </section>
        
        {/* Learning Paths Section */}
        <section className="learning-paths section">
          <div className="container">
            <h2 className="section-title">Choose Your Learning Path</h2>
            <div className="paths-grid">
              <div className="path-card">
                <div className="path-icon">🎵</div>
                <h3 className="path-title">For Musicians</h3>
                <p className="path-description">
                  Learn how to create, mix, and produce music directly on the Bitcoin blockchain using our sequencer tools.
                </p>
                <Link href="/learn/musicians" className="btn btn-secondary">Start Learning</Link>
              </div>
              
              <div className="path-card">
                <div className="path-icon">💻</div>
                <h3 className="path-title">For Developers</h3>
                <p className="path-description">
                  Explore the technical aspects of the Audionals protocol and learn how to build with our technology.
                </p>
                <Link href="/learn/developers" className="btn btn-secondary">Start Learning</Link>
              </div>
              
              <div className="path-card">
                <div className="path-icon">🔍</div>
                <h3 className="path-title">For Enthusiasts</h3>
                <p className="path-description">
                  Discover how Audionals is revolutionizing music production and rights management on the blockchain.
                </p>
                <Link href="/learn/enthusiasts" className="btn btn-secondary">Start Learning</Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* Tutorials Section */}
        <section className="tutorials-section section">
          <div className="container">
            <h2 className="section-title">Featured Tutorials</h2>
            <div className="tutorials-grid">
              <div className="tutorial-card">
                <div className="tutorial-image">
                  <div className="image-placeholder">
                    <span className="tutorial-icon">🎹</span>
                  </div>
                </div>
                <div className="tutorial-content">
                  <h3 className="tutorial-title">Getting Started with BitcoinBeats</h3>
                  <p className="tutorial-description">
                    Learn the basics of the BitcoinBeats sequencer and create your first on-chain composition.
                  </p>
                  <div className="tutorial-meta">
                    <span className="tutorial-difficulty beginner">Beginner</span>
                    <span className="tutorial-duration">15 min</span>
                  </div>
                  <Link href="/learn/tutorials/bitcoinbeats-basics" className="tutorial-link">View Tutorial</Link>
                </div>
              </div>
              
              <div className="tutorial-card">
                <div className="tutorial-image">
                  <div className="image-placeholder">
                    <span className="tutorial-icon">🎛️</span>
                  </div>
                </div>
                <div className="tutorial-content">
                  <h3 className="tutorial-title">Mastering the OrdSPD</h3>
                  <p className="tutorial-description">
                    Dive deep into the Ordinal Sample Pad Device and learn advanced techniques for sample manipulation.
                  </p>
                  <div className="tutorial-meta">
                    <span className="tutorial-difficulty intermediate">Intermediate</span>
                    <span className="tutorial-duration">20 min</span>
                  </div>
                  <Link href="/learn/tutorials/ordspd-advanced" className="tutorial-link">View Tutorial</Link>
                </div>
              </div>
              
              <div className="tutorial-card">
                <div className="tutorial-image">
                  <div className="image-placeholder">
                    <span className="tutorial-icon">📝</span>
                  </div>
                </div>
                <div className="tutorial-content">
                  <h3 className="tutorial-title">Understanding the JSON Standard</h3>
                  <p className="tutorial-description">
                    Explore the Audionals JSON standard and learn how audio data is stored on the Bitcoin blockchain.
                  </p>
                  <div className="tutorial-meta">
                    <span className="tutorial-difficulty advanced">Advanced</span>
                    <span className="tutorial-duration">25 min</span>
                  </div>
                  <Link href="/learn/tutorials/json-standard" className="tutorial-link">View Tutorial</Link>
                </div>
              </div>
            </div>
            <div className="tutorials-cta">
              <Link href="/learn/tutorials" className="btn btn-primary">View All Tutorials</Link>
            </div>
          </div>
        </section>
        
        {/* Documentation Section */}
        <section className="documentation-section section blockchain-bg">
          <div className="container">
            <h2 className="section-title">Documentation</h2>
            <p className="section-description">
              Comprehensive documentation for all Audionals tools and technologies
            </p>
            <div className="documentation-grid">
              <div className="documentation-card">
                <h3 className="documentation-title">Protocol Documentation</h3>
                <p className="documentation-description">
                  Technical specifications and implementation details of the Audionals protocol.
                </p>
                <Link href="/learn/documentation/protocol" className="documentation-link">View Documentation</Link>
              </div>
              
              <div className="documentation-card">
                <h3 className="documentation-title">JSON Standard</h3>
                <p className="documentation-description">
                  Detailed explanation of the Audionals JSON format for on-chain audio storage.
                </p>
                <Link href="/learn/documentation/json" className="documentation-link">View Documentation</Link>
              </div>
              
              <div className="documentation-card">
                <h3 className="documentation-title">BitcoinBeats API</h3>
                <p className="documentation-description">
                  API reference for integrating with the BitcoinBeats sequencer.
                </p>
                <Link href="/learn/documentation/bitcoinbeats-api" className="documentation-link">View Documentation</Link>
              </div>
              
              <div className="documentation-card">
                <h3 className="documentation-title">OrdSPD Reference</h3>
                <p className="documentation-description">
                  Complete reference guide for the Ordinal Sample Pad Device.
                </p>
                <Link href="/learn/documentation/ordspd-reference" className="documentation-link">View Documentation</Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* FAQ Section */}
        <section className="faq-section section">
          <div className="container">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h3 className="faq-question">What is Audionals?</h3>
                <p className="faq-answer">
                  Audionals is a pioneering protocol built on the Bitcoin blockchain that transforms music production, distribution, and rights management through an on-chain digital audio workstation (DAW).
                </p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">How does on-chain music production work?</h3>
                <p className="faq-answer">
                  On-chain music production involves creating and storing music directly on the blockchain. With Audionals, every element of a song (samples, patterns, effects) is stored as a Bitcoin Ordinal, with the composition itself referencing these elements through a JSON structure.
                </p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">Do I need Bitcoin to use Audionals?</h3>
                <p className="faq-answer">
                  While you can experiment with the tools without Bitcoin, storing your compositions on-chain as Ordinals requires Bitcoin for transaction fees. The amount needed depends on the size and complexity of your composition.
                </p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">How do rights management work with Audionals?</h3>
                <p className="faq-answer">
                  Audionals embeds rights directly into the song's digital structure. Every element involved in a song's creation is owned and held within individual wallets, with the song file itself serving as an immutable Merkle tree that references each component's wallet address and rights holder.
                </p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">Can I use Audionals with traditional DAWs?</h3>
                <p className="faq-answer">
                  Currently, Audionals operates as a standalone system. However, we're exploring integration options with traditional DAWs to allow for more complex production workflows while maintaining the benefits of on-chain rights management.
                </p>
              </div>
            </div>
            <div className="faq-cta">
              <Link href="/learn/faq" className="btn btn-secondary">View All FAQs</Link>
            </div>
          </div>
        </section>
        
        {/* Community Support Section */}
        <section className="community-support-section section">
          <div className="container">
            <h2 className="section-title">Community Support</h2>
            <p className="section-description">
              Get help from our active community of musicians, developers, and enthusiasts
            </p>
            <div className="support-options">
              <div className="support-option">
                <div className="support-icon">💬</div>
                <h3 className="support-title">Discord Community</h3>
                <p className="support-description">
                  Join our Discord server to connect with other users, share your creations, and get real-time support.
                </p>
                <a href="https://discord.gg/UR73BxmDmM" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Join Discord</a>
              </div>
              
              <div className="support-option">
                <div className="support-icon">🐦</div>
                <h3 className="support-title">Twitter</h3>
                <p className="support-description">
                  Follow us on Twitter for the latest updates, tips, and community highlights.
                </p>
                <a href="https://x.com/audionals" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Follow @audionals</a>
              </div>
              
              <div className="support-option">
                <div className="support-icon">📧</div>
                <h3 className="support-title">Email Support</h3>
                <p className="support-description">
                  Contact our support team directly for technical issues or specific questions.
                </p>
                <a href="mailto:support@audionals.com" className="btn btn-secondary">Contact Support</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      
      <style jsx>{`
        .learn-hero {
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
          margin-bottom: 3rem;
        }
        
        .section-description {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 3rem;
          font-size: 1.1rem;
          line-height: 1.8;
        }
        
        .paths-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }
        
        .path-card {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .path-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .path-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }
        
        .path-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .path-description {
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        
        .tutorials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-bottom: 3rem;
        }
        
        .tutorial-card {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .tutorial-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .tutorial-image {
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
        
        .tutorial-icon {
          font-size: 3rem;
        }
        
        .tutorial-content {
          padding: 1.5rem;
        }
        
        .tutorial-title {
          font-size: 1.2rem;
          margin-bottom: 1rem;
        }
        
        .tutorial-description {
          margin-bottom: 1.5rem;
          line-height: 1.6;
          color: var(--light-gray);
        }
        
        .tutorial-meta {
          display: flex;
          justify-content: space-between;
          ma<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>