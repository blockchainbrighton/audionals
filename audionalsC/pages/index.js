import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Components
import Header from '../components/Header';
import Footer from '../components/Footer';
import SequencerPreview from '../components/SequencerPreview';
import FeatureCard from '../components/FeatureCard';
import FeaturedComposition from '../components/FeaturedComposition';

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);

  const features = [
    {
      title: "On-Chain Music Production",
      description: "Create music directly on the Bitcoin blockchain with our revolutionary digital audio workstation.",
      icon: "🎵"
    },
    {
      title: "Decentralized Rights Management",
      description: "Every element of your music is securely managed and transparently documented on the blockchain.",
      icon: "🔒"
    },
    {
      title: "Creator Sovereignty",
      description: "Return control to artists by embedding rights directly into the song's digital structure.",
      icon: "👑"
    },
    {
      title: "Global Accessibility",
      description: "Make blockchain music technology affordable and accessible to all musicians worldwide.",
      icon: "🌍"
    }
  ];

  const featuredCompositions = [
    {
      title: "Bitcoin Beat #1",
      creator: "Satoshi Sound",
      image: "/compositions/bitcoin-beat-1.jpg",
      audioUrl: "#"
    },
    {
      title: "Blockchain Melody",
      creator: "Crypto Composer",
      image: "/compositions/blockchain-melody.jpg",
      audioUrl: "#"
    },
    {
      title: "Ordinal Opus",
      creator: "On-Chain Artist",
      image: "/compositions/ordinal-opus.jpg",
      audioUrl: "#"
    }
  ];

  return (
    <div className="home-page">
      <Header />
      
      {/* Hero Section */}
      <section className="hero blockchain-bg">
        <div className="container">
          <div className="grid">
            <div className="hero-content">
              <h1 className="fade-in">Revolutionizing Music Production on the Bitcoin Blockchain</h1>
              <p className="hero-subtitle">
                Audionals is a pioneering protocol that transforms music production, distribution, and rights management through an on-chain digital audio workstation.
              </p>
              <div className="hero-buttons">
                <Link href="/sequencer" className="btn btn-primary">Try Sequencer</Link>
                <Link href="/about" className="btn btn-secondary">Learn More</Link>
              </div>
            </div>
            <div className="hero-image">
              {/* Placeholder for hero image */}
              <div className="hero-image-placeholder">
                <span className="bitcoin-icon">₿</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Overview */}
      <section className="features section">
        <div className="container">
          <h2 className="section-title">Redefining Web3 Music</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <FeatureCard 
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
          <div className="features-cta">
            <Link href="/technology" className="btn btn-secondary">Explore Technology</Link>
          </div>
        </div>
      </section>
      
      {/* Sequencer Preview */}
      <section className="sequencer-preview section">
        <div className="container">
          <h2 className="section-title">Create On-Chain Music</h2>
          <p className="section-description">
            Experience the BitcoinBeats sequencer - our on-chain digital audio workstation that allows you to create music directly on the Bitcoin blockchain.
          </p>
          <SequencerPreview isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
          <div className="sequencer-cta">
            <Link href="/sequencer" className="btn btn-primary">Play Now</Link>
          </div>
        </div>
      </section>
      
      {/* Featured Compositions */}
      <section className="featured-compositions section">
        <div className="container">
          <h2 className="section-title">Featured Audionals</h2>
          <div className="compositions-grid">
            {featuredCompositions.map((composition, index) => (
              <FeaturedComposition 
                key={index}
                title={composition.title}
                creator={composition.creator}
                image={composition.image}
                audioUrl={composition.audioUrl}
              />
            ))}
          </div>
          <div className="compositions-cta">
            <Link href="/community" className="btn btn-secondary">View All</Link>
          </div>
        </div>
      </section>
      
      {/* Community Section */}
      <section className="community section">
        <div className="container">
          <h2 className="section-title">Join the Community</h2>
          <p className="section-description">
            Connect with creators, developers, and enthusiasts who are shaping the future of on-chain music production.
          </p>
          <div className="community-links">
            <a href="https://discord.gg/UR73BxmDmM" className="community-link" target="_blank" rel="noopener noreferrer">
              <span className="community-icon">Discord</span>
            </a>
            <a href="https://x.com/audionals" className="community-link" target="_blank" rel="noopener noreferrer">
              <span className="community-icon">Twitter</span>
            </a>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
