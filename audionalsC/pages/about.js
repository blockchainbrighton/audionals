import Head from 'next/head';
import Link from 'next/link';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function About() {
  return (
    <div className="about-page">
      <Head>
        <title>About Audionals - On-Chain Music Production on Bitcoin</title>
        <meta name="description" content="Learn about Audionals, a pioneering protocol that transforms music production, distribution and rights management on the Bitcoin blockchain." />
      </Head>
      
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="about-hero blockchain-bg">
          <div className="container">
            <h1 className="fade-in">About Audionals</h1>
            <p className="hero-subtitle">
              Revolutionizing music production and rights management on the Bitcoin blockchain
            </p>
          </div>
        </section>
        
        {/* Mission Section */}
        <section className="mission-section section">
          <div className="container">
            <div className="grid">
              <div className="mission-content">
                <h2>Our Mission</h2>
                <p>
                  Audionals is on a mission to transform the music industry by returning sovereignty to creators through blockchain technology. We believe that artists should have complete control over their work, from creation to distribution, with transparent and immutable rights management.
                </p>
                <p>
                  By operating entirely on-chain, we're creating a trustless ecosystem where every facet of music creation, collaboration, and ownership is securely managed and transparently documented on the Bitcoin blockchain.
                </p>
                <p>
                  Our vision is a musical landscape where creators are fairly compensated, rights are automatically enforced, and the barriers between artists and audiences are removed.
                </p>
              </div>
              <div className="mission-image">
                <div className="image-placeholder">
                  <span className="bitcoin-icon">₿</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Team Section */}
        <section className="team-section section">
          <div className="container">
            <h2 className="section-title">Our Team</h2>
            <div className="team-grid">
              <div className="team-member">
                <div className="member-image">
                  <div className="image-placeholder">
                    <span className="member-initial">J</span>
                  </div>
                </div>
                <h3 className="member-name">Jim Crane</h3>
                <p className="member-role">Founder</p>
                <p className="member-bio">
                  Jim is the visionary behind Audionals, combining his passion for music with expertise in blockchain technology to revolutionize how music is created and distributed.
                </p>
              </div>
              {/* Additional team members would be added here */}
            </div>
          </div>
        </section>
        
        {/* History Timeline */}
        <section className="history-section section">
          <div className="container">
            <h2 className="section-title">Our Journey</h2>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h3 className="timeline-date">June 2023</h3>
                  <h4 className="timeline-title">Audionals Founded</h4>
                  <p className="timeline-description">
                    Audionals was established with the vision of creating a new standard for on-chain music production on Bitcoin.
                  </p>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h3 className="timeline-date">July 2023</h3>
                  <h4 className="timeline-title">First Prototype</h4>
                  <p className="timeline-description">
                    The first prototype of the Audionals sequencer was developed and tested on the Bitcoin testnet.
                  </p>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h3 className="timeline-date">October 2023</h3>
                  <h4 className="timeline-title">Public Launch</h4>
                  <p className="timeline-description">
                    Audionals was officially launched to the public, allowing creators to produce music directly on the Bitcoin blockchain.
                  </p>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h3 className="timeline-date">Present</h3>
                  <h4 className="timeline-title">Ongoing Innovation</h4>
                  <p className="timeline-description">
                    Continuing to develop new features and improvements to the Audionals protocol and tools.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="cta-section section blockchain-bg">
          <div className="container">
            <h2 className="cta-title">Join the Revolution</h2>
            <p className="cta-description">
              Be part of the future of music production on the blockchain.
            </p>
            <div className="cta-buttons">
              <Link href="/sequencer" className="btn btn-primary">Try the Sequencer</Link>
              <Link href="/community" className="btn btn-secondary">Join Our Community</Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      
      <style jsx>{`
        .about-hero {
          padding: 8rem 0 4rem;
          text-align: center;
          color: var(--white);
        }
        
        .hero-subtitle {
          font-size: 1.5rem;
          max-width: 800px;
          margin: 1.5rem auto 0;
        }
        
        .mission-section {
          padding: 5rem 0;
        }
        
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        
        .mission-content h2 {
          margin-bottom: 2rem;
        }
        
        .mission-content p {
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
          line-height: 1.8;
        }
        
        .mission-image {
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
        
        .bitcoin-icon {
          font-size: 5rem;
          color: var(--bitcoin-orange);
        }
        
        .team-section {
          background-color: rgba(255, 255, 255, 0.02);
          padding: 5rem 0;
        }
        
        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 3rem;
          margin-top: 3rem;
        }
        
        .team-member {
          text-align: center;
        }
        
        .member-image {
          width: 200px;
          height: 200px;
          margin: 0 auto 1.5rem;
        }
        
        .member-initial {
          font-size: 4rem;
          font-weight: bold;
          color: var(--bitcoin-orange);
        }
        
        .member-name {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        
        .member-role {
          color: var(--bitcoin-orange);
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .member-bio {
          color: var(--light-gray);
          line-height: 1.6;
        }
        
        .history-section {
          padding: 5rem 0;
        }
        
        .timeline {
          position: relative;
          max-width: 800px;
          margin: 3rem auto 0;
          padding: 2rem 0;
        }
        
        .timeline::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          background-color: var(--bitcoin-orange);
          transform: translateX(-50%);
        }
        
        .timeline-item {
          position: relative;
          margin-bottom: 3rem;
          display: flex;
        }
        
        .timeline-marker {
          position: absolute;
          left: 50%;
          top: 0;
          width: 20px;
          height: 20px;
          background-color: var(--bitcoin-orange);
          border-radius: 50%;
          transform: translateX(-50%);
          z-index: 1;
        }
        
        .timeline-content {
          width: 45%;
          padding: 1.5rem;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .timeline-item:nth-child(odd) .timeline-content {
          margin-left: auto;
        }
        
        .timeline-date {
          color: var(--bitcoin-orange);
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        
        .timeline-title {
          font-size: 1.3rem;
          margin-bottom: 1rem;
        }
        
        .timeline-description {
          color: var(--light-gray);
          line-height: 1.6;
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
          .grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .mission-image {
            order: -1;
          }
          
          .timeline::before {
            left: 30px;
          }
          
          .timeline-marker {
            left: 30px;
          }
          
          .timeline-content {
            width: calc(100% - 60px);
            margin-left: 60px !important;
          }
        }
      `}</style>
    </div>
  );
}
