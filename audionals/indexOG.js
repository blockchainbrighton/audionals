// --- START OF FILE index.js ---

import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Audionals - On-Chain Music Production on Bitcoin</title>
        <meta name="description" content="Audionals is a pioneering protocol that transforms music production, distribution and rights management by offering an on-chain digital audio workstation built on the Bitcoin blockchain." />
        <link rel="icon" href="/favicon.ico" />
        {/* Consider adding a reference to your global CSS if not automatically handled */}
        {/* <link rel="stylesheet" href="/styles/globals.css" /> */}
      </Head>

      {/* Consistent Header Component (Consider extracting to a separate component later) */}
      <header className="bg-black py-4 px-6 fixed w-full z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="mr-2">
              {/* Ensure logo path is correct */}
              <img src="/logo.png" alt="Audionals Logo" className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">Audionals</h1>
          </div>
          <nav className="hidden md:block">
            <ul className="flex space-x-6">
              {/* Updated Navigation Links */}
              <li><Link href="/" className="nav-link">Home</Link></li>
              <li><Link href="/about" className="nav-link">About</Link></li>
              <li><Link href="/technology" className="nav-link">Technology</Link></li>
              <li><Link href="/tools" className="nav-link">Tools</Link></li>
              <li><Link href="/learn" className="nav-link">Learn</Link></li>
              <li><Link href="/community" className="nav-link">Community</Link></li>
              <li><Link href="/blog" className="nav-link">Blog</Link></li>
              <li><Link href="/support" className="nav-link">Support</Link></li>
            </ul>
          </nav>
          <div className="md:hidden">
            {/* Mobile Menu Button - Functionality not implemented here */}
            <button className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-black to-gray-900">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h2 className="text-5xl font-bold mb-6">Create Music Directly on the Bitcoin Blockchain</h2>
                <p className="text-xl mb-8">
                  Audionals is a pioneering protocol that transforms music production, distribution, and rights management by offering an on-chain digital audio workstation built on the Bitcoin blockchain.
                </p>
                <div className="flex space-x-4">
                  <Link href="/tools" className="btn-primary">
                    Try the Sequencer
                  </Link>
                  <Link href="/learn" className="btn-secondary">
                    Learn More
                  </Link>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative">
                  {/* Adjusted image container styling if needed */}
                  <div className="bg-gray-800 rounded-lg p-1 shadow-xl">
                     {/* Ensure image path is correct */}
                    <img src="/sequencer-preview.png" alt="Audional Sequencer Preview" className="rounded-lg w-full" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-bitcoin-orange text-white px-4 py-2 rounded-lg font-bold">
                    Audional Sequencer
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <h2 className="section-heading">Key Benefits of Audionals Protocol</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Benefit Card 1 */}
              <div className="card p-8">
                <div className="text-bitcoin-orange text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">True Ownership</h3>
                <p className="text-gray-300">
                  Every element involved in a song's creation is owned and held within individual wallets, eliminating the need for traditional intermediaries.
                </p>
              </div>
              {/* Benefit Card 2 */}
              <div className="card p-8">
                <div className="text-bitcoin-orange text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">On-Chain Production</h3>
                <p className="text-gray-300">
                  Create music directly on the Bitcoin blockchain with our decentralized audio workstation, ensuring immutable recordings of your creative process.
                </p>
              </div>
              {/* Benefit Card 3 */}
              <div className="card p-8">
                <div className="text-bitcoin-orange text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">Transparent Attribution</h3>
                <p className="text-gray-300">
                  Comprehensive and transparent attribution for every component used in creating a song, recognizing all contributors automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-6 bg-gray-800">
          <div className="container mx-auto">
            <h2 className="section-heading">How It Works</h2>
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
                {/* Step 1 */}
                <div className="flex items-start mb-8">
                  <div className="bg-bitcoin-orange text-white rounded-full w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0 font-bold">1</div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Create Music</h3>
                    <p className="text-gray-300">Use our on-chain digital audio workstation to compose and produce music directly on the Bitcoin blockchain.</p>
                  </div>
                </div>
                 {/* Step 2 */}
                <div className="flex items-start mb-8">
                  <div className="bg-bitcoin-orange text-white rounded-full w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0 font-bold">2</div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Secure Ownership</h3>
                    <p className="text-gray-300">Every element of your creation is securely managed and transparently documented on the blockchain.</p>
                  </div>
                </div>
                 {/* Step 3 */}
                <div className="flex items-start mb-8">
                  <div className="bg-bitcoin-orange text-white rounded-full w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0 font-bold">3</div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Distribute & Collaborate</h3>
                    <p className="text-gray-300">Share your music, collaborate with others, and manage rights transparently on the Bitcoin network.</p>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2">
                {/* Ensure image path is correct */}
                <img src="/how-it-works.png" alt="How Audionals Works" className="rounded-lg shadow-xl w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Projects Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-4xl font-bold">Featured Projects</h2>
              <Link href="/community#projects" className="text-bitcoin-orange hover:text-orange-600 font-semibold">
                View All Projects →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Project Card 1 */}
              <div className="card">
                {/* Ensure image path is correct */}
                <img src="/project1.png" alt="Featured Project 1" className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">Blockchain Symphony</h3>
                  <p className="text-gray-300 mb-4 text-sm">An experimental piece combining classical elements with electronic sounds, all produced on-chain.</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-400">By CryptoComposer</span>
                    <Link href="/project/1" className="text-bitcoin-orange hover:text-orange-600 text-sm font-semibold">
                      Listen →
                    </Link>
                  </div>
                </div>
              </div>
              {/* Project Card 2 */}
               <div className="card">
                 {/* Ensure image path is correct */}
                <img src="/project2.png" alt="Featured Project 2" className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">Satoshi's Beats</h3>
                  <p className="text-gray-300 mb-4 text-sm">A hip-hop collection inspired by the origins of Bitcoin, featuring samples from early blockchain history.</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-400">By BlockBeats</span>
                    <Link href="/project/2" className="text-bitcoin-orange hover:text-orange-600 text-sm font-semibold">
                      Listen →
                    </Link>
                  </div>
                </div>
              </div>
              {/* Project Card 3 */}
               <div className="card">
                 {/* Ensure image path is correct */}
                <img src="/project3.png" alt="Featured Project 3" className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">Decentralized Harmony</h3>
                  <p className="text-gray-300 mb-4 text-sm">A collaborative album created by 12 artists across the globe, each contributing unique on-chain elements.</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-400">By Web3 Musicians Collective</span>
                    <Link href="/project/3" className="text-bitcoin-orange hover:text-orange-600 text-sm font-semibold">
                      Listen →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Latest News Section */}
        <section className="py-20 px-6 bg-gray-800">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-4xl font-bold">Latest News</h2>
              <Link href="/blog" className="text-bitcoin-orange hover:text-orange-600 font-semibold">
                View All Posts →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* News Card 1 */}
              <div className="bg-gray-900 rounded-lg overflow-hidden card">
                <div className="p-6">
                  <span className="text-bitcoin-orange text-sm font-semibold">March 20, 2025</span>
                  <h3 className="text-2xl font-bold my-2">Introducing the New Audional Sequencer v2</h3>
                  <p className="text-gray-300 mb-4">We're excited to announce the latest version of our on-chain sequencer with enhanced features and improved user experience.</p>
                  <Link href="/blog/new-sequencer-v2" className="text-bitcoin-orange hover:text-orange-600 font-semibold">
                    Read More →
                  </Link>
                </div>
              </div>
               {/* News Card 2 */}
              <div className="bg-gray-900 rounded-lg overflow-hidden card">
                <div className="p-6">
                  <span className="text-bitcoin-orange text-sm font-semibold">March 15, 2025</span>
                  <h3 className="text-2xl font-bold my-2">The Future of Music Rights Management on Bitcoin</h3>
                  <p className="text-gray-300 mb-4">Explore how the Audionals protocol is revolutionizing music rights management through blockchain technology.</p>
                  <Link href="/blog/rights-management-future" className="text-bitcoin-orange hover:text-orange-600 font-semibold">
                    Read More →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-orange-600 to-bitcoin-orange">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Join the Future of Music Production</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Start creating music directly on the Bitcoin blockchain and take control of your creative rights with Audionals.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/tools" className="bg-white text-bitcoin-orange hover:bg-gray-200 font-bold py-3 px-8 rounded-lg transition duration-300">
                Try the Sequencer
              </Link>
              <Link href="/community" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-bitcoin-orange font-bold py-3 px-8 rounded-lg transition duration-300">
                Join the Community
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Consistent Footer Component (Consider extracting to a separate component later) */}
      <footer className="bg-black py-12 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Column 1: Logo & About */}
            <div>
              <div className="flex items-center mb-4">
                <img src="/logo.png" alt="Audionals Logo" className="h-8 w-8 mr-2" />
                <h3 className="text-xl font-bold">Audionals</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Revolutionizing music production and rights management on the Bitcoin blockchain.
              </p>
              {/* Social Links Placeholder */}
              <div className="flex space-x-4">
                 <a href="#" className="text-gray-400 hover:text-bitcoin-orange transition duration-300"><span className="sr-only">Twitter</span> {/* Placeholder Icon */} T</a>
                 <a href="#" className="text-gray-400 hover:text-bitcoin-orange transition duration-300"><span className="sr-only">Discord</span> {/* Placeholder Icon */} D</a>
                 <a href="#" className="text-gray-400 hover:text-bitcoin-orange transition duration-300"><span className="sr-only">Github</span> {/* Placeholder Icon */} G</a>
              </div>
            </div>

             {/* Column 2: Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-400 hover:text-bitcoin-orange text-sm transition duration-300">About Us</Link></li>
                <li><Link href="/technology" className="text-gray-400 hover:text-bitcoin-orange text-sm transition duration-300">Technology</Link></li>
                <li><Link href="/blog" className="text-gray-400 hover:text-bitcoin-orange text-sm transition duration-300">Blog</Link></li>
                <li><Link href="/tools" className="text-gray-400 hover:text-bitcoin-orange text-sm transition duration-300">Tools</Link></li>
              </ul>
            </div>

             {/* Column 3: Resources */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/learn" className="text-gray-400 hover:text-bitcoin-orange text-sm transition duration-300">Documentation</Link></li>
                <li><Link href="/community" className="text-gray-400 hover:text-bitcoin-orange text-sm transition duration-300">Community Hub</Link></li>
                <li><Link href="/support" className="text-gray-400 hover:text-bitcoin-orange text-sm transition duration-300">Support Center</Link></li>
                <li><Link href="/support#faq" className="text-gray-400 hover:text-bitcoin-orange text-sm transition duration-300">FAQ</Link></li>
              </ul>
            </div>

            {/* Column 4: Newsletter */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Stay Updated</h3>
              <p className="text-gray-400 text-sm mb-4">Join our newsletter for the latest updates.</p>
              <form>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-grow bg-gray-800 border border-gray-700 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:border-bitcoin-orange"
                  />
                  <button type="submit" className="bg-bitcoin-orange hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-r-lg text-sm transition duration-300">
                    Subscribe
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Audionals Protocol. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
// --- END OF FILE index.js ---