import Image from "next/image";

// Data (Ideally fetch or import from a separate file/CMS later)
const socialLinks = {
  audionalsSite: "https://audionals.com/",
  jimTwitter: "https://twitter.com/jimdotbtc",
  audionalsTwitter: "https://x.com/audionals",
  discord: "https://discord.gg/UR73BxmDmM",
  bitcoinLiveTwitter: "https://x.com/bitcoinlive1?lang=en",
};

const onChainTracks = [
  {
    title: "TRUTH",
    description: "An exploration of veracity on the blockchain.",
    url: "https://gamma.io/ordinals/collections/truth",
  },
  {
    title: "FREEDOM",
    description: "Musical expression unchained.",
    url: "https://gamma.io/ordinals/collections/freedom",
  },
  {
    title: "I LOVE CHEESE",
    description: "A quirky, memorable on-chain composition.",
    url: "https://gamma.io/ordinals/collections/i-love-cheese",
  },
];

const popularEpisodes = [
  {
    title: "Audionals Unleashed: Music x Blockchain x Creator Rights - Bitcoin Unleashed",
    summary: "Jim Crane (Jim.BTC) presents Audionals at Bitcoin Unleashed. He discusses his background as a music producer and tour manager, highlighting the issues with music royalties. He details his journey into crypto, starting with importing the UK's first Bitcoin ATM in 2014, meeting Stacks core developer Mike Cohen, and co-founding 'This is #1', the first NFT marketplace on Stacks. The marketplace initially focused on music NFTs, collaborating with artists like Fatboy Slim, Orbital, and Cara Delevingne. Jim explains the shift to Bitcoin Ordinals, emphasizing their nature as single, on-chain entities combining content and ownership. He introduces Audionals as a project born from the desire to fix the music industry's broken system, leveraging Ordinals to create on-chain music tools and foster a decentralized music ecosystem.",
    youtube: "https://www.youtube.com/watch?v=kFmMPR5y8IQ",
    twitter: null, // Add twitter link if found
  },
  {
    title: "Produce Music on Bitcoin with Audionals! Jim.BTC Interview - Ordinals Inscriptions",
    summary: "In this interview on Digital Assets Explained, Jim.BTC discusses Audionals, a free music sequencer available on-chain via Bitcoin Ordinals. He explains his motivation stemming from the complexities of music royalties and his history in the crypto space, including founding 'This is #1' on Stacks. Jim highlights how Ordinals enable fully on-chain, interactive music experiences. He demos the Audionals sequencer, showcasing its features like pattern creation, instrument selection (synths, drums), and the ability to inscribe the final musical piece directly onto Bitcoin as an Ordinal. The discussion touches on the potential for collaborative music creation and the future of decentralized music production.",
    youtube: "https://www.youtube.com/watch?v=SCuEn9wV5H8",
    twitter: null,
  },
  {
    title: "Leather Lounge Ep. 11: Making music on Bitcoin with Audionals and Jim.btc",
    summary: "Jim.btc joins the Leather Lounge podcast to discuss Audionals. He shares his extensive background in the music industry and his early involvement in Bitcoin, including bringing the first Bitcoin ATM to the UK. Jim explains the concept behind Audionals: creating music tools and experiences directly on the Bitcoin blockchain using Ordinals. He contrasts this with earlier NFT projects on Stacks ('This is #1'), emphasizing the unique properties of Ordinals. The conversation covers the technical aspects of inscribing music data, the potential for artists to control their work, and the broader vision for a decentralized music ecosystem built on Bitcoin.",
    youtube: "https://www.youtube.com/watch?v=jHPDhmSrr6c",
    twitter: null,
  },
];

const stacksProjects = [
  {
    name: "This Is #1",
    description: "The world's first curated Bitcoin NFT Marketplace on Stacks, co-founded by Jim.BTC. Pioneered music NFTs on Stacks.",
    url: "https://thisisnumberone.com/",
  },
  {
    name: "Parrot Radio",
    description: "Web3 mobile music app for audio/visual NFTs on Stacks. Featured on #TheAudionalsShow.",
    url: "https://thepandemonium.io/radio",
    twitter: "https://x.com/parrotrad1o",
  },
  {
    name: "Gated",
    description: "Platform for music NFTs on Stacks, potentially offering .wav files and song art.",
    url: "https://gated.so/",
  },
  {
    name: "Gamma.io",
    description: "Open marketplace for Bitcoin NFTs (including Stacks), hosting Jim.BTC's profile and tracks.",
    url: "https://gamma.io/",
    stacksUrl: "https://stacks.gamma.io/",
  },
  {
    name: "Proof of Transfer (PoX)",
    description: "Stacks' consensus mechanism, anchoring its security to Bitcoin, benefiting the entire ecosystem.",
    url: "https://docs.stacks.co/concepts/stacks-101/proof-of-transfer",
  },
];

const ordinalProjects = [
  {
    name: "BeatBlocks",
    description: "Generative Music 100% on Bitcoin. Launched the 'BeatBlock Genesis' collection.",
    url: "https://magiceden.io/ordinals/launchpad/beatblock-genesis",
    twitter: "https://x.com/beatblocksbtc",
  },
  {
    name: "Rare Scrilla",
    description: "Digital artist and collaborator in the Ordinals music scene (e.g., with Ghostface Killah).",
    twitter: "https://x.com/scrillaventura",
  },
  {
    name: "French Montana",
    description: "First mainstream artist to inscribe a complete song ('Bag Curious') on Bitcoin via Ordinals.",
  },
  {
    name: "Ghostface Killah",
    description: "Wu-Tang Clan member who released exclusive music as free-to-mint Ordinals with CC0 rights.",
  },
  {
    name: "OrdinalsBot",
    description: "Service for inscribing larger files on Bitcoin, used in collaborations.",
    url: "https://ordinalsbot.com/" // Assumed URL, verify if possible
  },
  {
    name: "Magic Eden",
    description: "Major NFT marketplace supporting Ordinals.",
    url: "https://magiceden.io/ordinals",
  },
  {
    name: "Unisat",
    description: "Wallet and marketplace for Ordinals.",
    url: "https://unisat.io/",
  },
  // Add others like Gamma, Ordswap, Xverse if desired
];

// Helper component for external links
const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-accent hover:text-accentHover underline transition-colors duration-200"
  >
    {children}
  </a>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-textPrimary font-sans">
      {/* Header */}
      <header className="py-6 px-4 md:px-8 border-b border-borderColor">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image src="/audionals_logo.jpeg" alt="Audionals Logo" width={40} height={40} className="rounded-md" />
            <h1 className="text-xl md:text-2xl font-bold">Jim.BTC's Audionals Show</h1>
          </div>
          {/* Optional Nav can go here */}
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-12 space-y-16">
        {/* Introduction Section */}
        <section id="intro">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/4 flex justify-center">
               <Image src="/jim_btc_logo.png" alt="Jim.BTC Logo" width={150} height={150} className="rounded-full border-2 border-accent" />
            </div>
            <div className="md:w-3/4 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-accent">Welcome to the World of Audionals</h2>
              <p className="text-lg text-textSecondary">
                Join <ExternalLink href={socialLinks.jimTwitter}>Jim.BTC (Jim Crane)</ExternalLink>, a pioneer in on-chain music, exploring the revolutionary Audionals protocol.
                Audionals enables the creation, distribution, and management of music directly on the Bitcoin blockchain using Ordinals technology, featuring tools like the on-chain Audional Sequencer.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <ExternalLink href={socialLinks.audionalsSite}>Audionals.com</ExternalLink>
                <ExternalLink href={socialLinks.audionalsTwitter}>Audionals Twitter</ExternalLink>
                <ExternalLink href={socialLinks.discord}>Discord Community</ExternalLink>
                <ExternalLink href={socialLinks.bitcoinLiveTwitter}>Bitcoin Live</ExternalLink>
              </div>
            </div>
          </div>
        </section>

        {/* On-Chain Tracks Section */}
        <section id="tracks">
          <h2 className="text-3xl font-bold mb-6 text-center">Music Inscribed on Bitcoin</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {onChainTracks.map((track) => (
              <div key={track.title} className="bg-cardBackground p-6 rounded-lg border border-borderColor shadow-lg">
                <h3 className="text-xl font-semibold mb-2 text-accent">{track.title}</h3>
                <p className="text-textSecondary mb-4">{track.description}</p>
                <ExternalLink href={track.url}>View on Gamma.io</ExternalLink>
              </div>
            ))}
          </div>
        </section>

        {/* Episode Highlights Section */}
        <section id="episodes">
          <h2 className="text-3xl font-bold mb-8 text-center">Show Highlights & Popular Episodes</h2>
          <div className="space-y-8">
            {popularEpisodes.map((episode) => (
              <div key={episode.title} className="bg-cardBackground p-6 rounded-lg border border-borderColor shadow-lg">
                <h3 className="text-xl font-semibold mb-3">{episode.title}</h3>
                <p className="text-textSecondary mb-4 leading-relaxed">{episode.summary}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <ExternalLink href={episode.youtube}>Watch on YouTube</ExternalLink>
                  {episode.twitter && <ExternalLink href={episode.twitter}>View on Twitter</ExternalLink>}
                </div>
              </div>
            ))}
          </div>
          {/* Consider adding a link/button to a full episode list if implemented */}
        </section>

        {/* Stacks Music Section */}
        <section id="stacks-music">
          <h2 className="text-3xl font-bold mb-8 text-center">The Future of Music on Stacks (Bitcoin L2)</h2>
          <p className="text-center text-textSecondary mb-8 max-w-3xl mx-auto">
            Explore the vibrant music ecosystem built on Stacks, Bitcoin's Layer 2, leveraging the security of Bitcoin through Proof of Transfer (PoX). Jim.BTC has been instrumental in this space since its inception.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stacksProjects.map((project) => (
              <div key={project.name} className="bg-cardBackground p-6 rounded-lg border border-borderColor shadow-lg flex flex-col">
                <h3 className="text-xl font-semibold mb-2 text-accent">{project.name}</h3>
                <p className="text-textSecondary mb-4 flex-grow">{project.description}</p>
                <div className="flex flex-wrap gap-4 text-sm mt-auto">
                  {project.url && <ExternalLink href={project.url}>{project.name === "Proof of Transfer (PoX)" ? "Learn More" : "Visit Site"}</ExternalLink>}
                  {project.stacksUrl && <ExternalLink href={project.stacksUrl}>Stacks Platform</ExternalLink>}
                  {project.twitter && <ExternalLink href={project.twitter}>Twitter</ExternalLink>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Further Listening (Ordinals) Section */}
        <section id="ordinals-music">
          <h2 className="text-3xl font-bold mb-8 text-center">Dive Deeper: Bitcoin Ordinals Music</h2>
           <p className="text-center text-textSecondary mb-8 max-w-3xl mx-auto">
            The Bitcoin Ordinals space is buzzing with musical innovation. Discover more artists, projects, and platforms pushing the boundaries of on-chain music.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ordinalProjects.map((project) => (
              <div key={project.name} className="bg-cardBackground p-6 rounded-lg border border-borderColor shadow-lg flex flex-col">
                <h3 className="text-xl font-semibold mb-2 text-accent">{project.name}</h3>
                <p className="text-textSecondary mb-4 flex-grow">{project.description}</p>
                <div className="flex flex-wrap gap-4 text-sm mt-auto">
                  {project.url && <ExternalLink href={project.url}>Visit Site</ExternalLink>}
                  {project.twitter && <ExternalLink href={project.twitter}>Twitter</ExternalLink>}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-8 border-t border-borderColor mt-16">
        <div className="container mx-auto text-center text-textSecondary text-sm">
          <p>Exploring the intersection of music, Bitcoin, and decentralization with Jim.BTC & Audionals.</p>
          <div className="flex justify-center flex-wrap gap-4 mt-4">
            <ExternalLink href={socialLinks.audionalsSite}>Audionals.com</ExternalLink>
            <ExternalLink href={socialLinks.jimTwitter}>Jim.BTC Twitter</ExternalLink>
            <ExternalLink href={socialLinks.audionalsTwitter}>Audionals Twitter</ExternalLink>
            <ExternalLink href={socialLinks.discord}>Discord</ExternalLink>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} - Website created for informational purposes.</p>
        </div>
      </footer>
    </div>
  );
}

