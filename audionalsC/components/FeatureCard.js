export default function FeatureCard({ title, description, icon }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
      
      <style jsx>{`
        .feature-card {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 2rem;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, var(--bitcoin-orange), var(--electric-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }
        
        .feature-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: var(--white);
        }
        
        .feature-description {
          color: var(--light-gray);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
