import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>About - Audionals</title>
        <meta name="description" content="Learn about Audionals, a pioneering protocol that transforms music production, distribution and rights management on the Bitcoin blockchain." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-black py-4 px-6 fixed w-full z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="mr-2">
              <img src="/logo.png" alt="Audionals Logo" className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">Audionals</h1>
          </div>
          <nav className="hidden md:block">
            <ul className="flex space-x-6">
              <li><Link href="/" className="hover:text-orange-400">Home</Link></li>
              <li><Link href="/about" className="hover:text-orange-400">About</Link></li>
              <li><Link href="/technology" className="hover:text-orange-400">Technology</Link></li>
              <li><Link href="/tools" className="hover:text-orange-400">Tools</Link></li>
              <li><Link href="/learn" className="hover:text-orange-400">Learn</Link></li>
              <li><Link href="/community" className="hover:text-orange-400">Community</Link></li>
              <li><Link href="/blog" className="hover:text-orange-400">Blog</Link></li>
              <li><Link href="/support" className="hover:text-orange-400">Support</Link></li>
            </ul>
          </nav>
          <div className="md:hidden">
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
            <h1 className="text-5xl font-bold mb-6 text-center">About Audionals</h1>
            <p className="text-xl text-center max-w-3xl mx-auto">
              Revolutionizing music production and rights management on the Bitcoin blockchain.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
                <h2 className="text-4xl font-bold mb-6">Our Mission</h2>
                <p className="text-xl mb-6">
                  Audionals is redefining how music is created, owned, and distributed by embedding rights directly into the song's digital structure, ensuring transparency, immutability, and decentralized ownership.
                </p>
                <p className="text-xl">
                  We're building a new era of music production in the Web3 landscape where artists have true sovereignty over their creations, and every contributor is recognized and rewarded fairly.
                </p>
              </div>
              <div className="md:w-1/2">
                <img src="/mission-image.png" alt="Audionals Mission" className="rounded-lg shadow-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 px-6 bg-gray-800">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Meet Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card p-6 text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6">
                  <img src="/team-member-1.png" alt="Jim Crane" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Jim Crane</h3>
                <p className="text-orange-500 mb-4">Founder & Lead Developer</p>
                <p className="text-gray-300">
                  Jim is the creator of Audionals and a passionate advocate for blockchain technology in the music industry. With over 15 years of experience in audio engineering and software development, he's leading the revolution in on-chain music production.
                </p>
              </div>
              <div className="card p-6 text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6">
                  <img src="/team-member-2.png" alt="Sarah Chen" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Sarah Chen</h3>
                <p className="text-orange-500 mb-4">Technical Architect</p>
                <p className="text-gray-300">
                  Sarah brings extensive experience in blockchain development and audio processing. She's responsible for the technical architecture of the Audionals protocol and ensuring seamless integration with the Bitcoin blockchain.
                </p>
              </div>
              <div className="card p-6 text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6">
                  <img src="/team-member-3.png" alt="Marcus Johnson" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Marcus Johnson</h3>
                <p className="text-orange-500 mb-4">Music Industry Advisor</p>
                <p className="text-gray-300">
                  Marcus has 20+ years of experience in the music industry as both a producer and rights management expert. He guides Audionals' development to ensure it meets the real needs of musicians and producers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Our Story</h2>
            <div className="max-w-4xl mx-auto">
              <div className="mb-12">
                <h3 className="text-2xl font-bold mb-4">The Beginning</h3>
                <p className="text-gray-300 mb-4">
                  Audionals began as an innovative standard for the indexing and standardization of audio files inscribed as text strings on the Bitcoin blockchain. What started as an experiment in blockchain technology quickly evolved into a revolutionary approach to music production and rights management.
                </p>
                <p className="text-gray-300">
                  Founded by Jim Crane, a software developer and musician, Audionals was born from the frustration of seeing artists lose control over their work and struggle with complex rights management systems.
                </p>
              </div>
              <div className="mb-12">
                <h3 className="text-2xl font-bold mb-4">The Evolution</h3>
                <p className="text-gray-300 mb-4">
                  As the Ordinals protocol gained traction on Bitcoin, we saw an opportunity to create something truly revolutionary: a complete on-chain digital audio workstation that would not only allow for music creation but would also embed rights management directly into the creative process.
                </p>
                <p className="text-gray-300">
                  The team expanded, bringing together experts in blockchain technology, audio engineering, and music rights management to build a comprehensive solution for the music industry's most persistent challenges.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Today and Beyond</h3>
                <p className="text-gray-300 mb-4">
                  Today, Audionals stands as a cutting-edge standard for bringing a multitude of benefits to digital creative industries. Our on-chain sequencer and comprehensive JSON structure are revolutionizing how music is created, owned, and distributed.
                </p>
                <p className="text-gray-300">
                  Looking ahead, we're committed to continuous innovation, expanding our tools and capabilities while maintaining our core mission: returning sovereignty to creators and shaping a new musical landscape around true ownership and fair attribution.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section className="py-20 px-6 bg-gray-800">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Roadmap</h2>
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-0 md:left-1/2 transform md:translate-x-[-50%] h-full w-1 bg-orange-500"></div>
                
                {/* Timeline items */}
                <div className="relative z-10">
                  {/* Item 1 */}
                  <div className="flex flex-col md:flex-row items-start mb-12">
                    <div className="md:w-1/2 md:pr-8 md:text-right mb-6 md:mb-0">
                      <h3 className="text-2xl font-bold mb-2">Q1 2025</h3>
                      <div className="bg-gray-900 p-6 rounded-lg">
                        <h4 className="text-xl font-bold mb-2 text-orange-500">Launch of Enhanced Sequencer</h4>
                        <p className="text-gray-300">
                          Release of the improved BitcoinBeats Sequencer with enhanced UI/UX and additional features for professional music production.
                        </p>
                      </div>
                    </div>
                    <div className="md:w-1/2 md:pl-8 hidden md:block"></div>
                    <div className="absolute left-0 md:left-1/2 transform md:translate-x-[-50%] w-6 h-6 rounded-full bg-orange-500 border-4 border-gray-800 mt-6 md:mt-0"></div>
                  </div>
                  
                  {/* Item 2 */}
                  <div className="flex flex-col md:flex-row items-start mb-12">
                    <div className="md:w-1/2 md:pr-8 hidden md:block"></div>
                    <div className="md:w-1/2 md:pl-8 mb-6 md:mb-0">
                      <h3 className="text-2xl font-bold mb-2">Q2 2025</h3>
                      <div className="bg-gray-900 p-6 rounded-lg">
                        <h4 className="text-xl font-bold mb-2 text-orange-500">Community Marketplace</h4>
                        <p className="text-gray-300">
                          Introduction of a marketplace for Audional creators to share, sell, and collaborate on music projects directly on the blockchain.
                        </p>
                      </div>
                    </div>
                    <div className="absolute left-0 md:left-1/2 transform md:translate-x-[-50%] w-6 h-6 rounded-full bg-orange-500 border-4 border-gray-800 mt-6 md:mt-0"></div>
                  </div>
                  
                  {/* Item 3 */}
                  <div className="flex flex-col md:flex-row items-start mb-12">
                    <div className="md:w-1/2 md:pr-8 md:text-right mb-6 md:mb-0">
                      <h3 className="text-2xl font-bold mb-2">Q3 2025</h3>
                      <div className="bg-gray-900 p-6 rounded-lg">
                        <h4 className="text-xl font-bold mb-2 text-orange-500">Advanced Rights Management</h4>
                        <p className="text-gray-300">
                          Implementation of enhanced rights management features, including automated royalty distribution and licensing tools.
                        </p>
                      </div>
                    </div>
                    <div className="md:w-1/2 md:pl-8 hidden md:block"></div>
                    <div className="absolute left-0 md:left-1/2 transform md:translate-x-[-50%] w-6 h-6 rounded-full bg-orange-500 border-4 border-gray-800 mt-6 md:mt-0"></div>
                  </div>
                  
                  {/* Item 4 */}
                  <div className="flex flex-col md:flex-row items-start">
                    <div className="md:w-1/2 md:pr-8 hidden md:block"></div>
                    <div className="md:w-1/2 md:pl-8">
                      <h3 className="text-2xl font-bold mb-2">Q4 2025</h3>
                      <div className="bg-gray-900 p-6 rounded-lg">
                        <h4 className="text-xl font-bold mb-2 text-orange-500">Mobile Application</h4>
                        <p className="text-gray-300">
                          Launch of Audionals mobile app, bringing on-chain music production to iOS and Android devices with seamless integration with the desktop platform.
                        </p>
                      </div>
                    </div>
                    <div className="absolute left-0 md:left-1/2 transform md:translate-x-[-50%] w-6 h-6 rounded-full bg-orange-500 border-4 border-gray-800 mt-6 md:mt-0"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-orange-600 to-orange-400">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Join Our Journey</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Be part of the revolution in music production and rights management. Start creating with Audionals today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/tools" className="bg-white text-orange-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg">
                Try the Sequencer
              </Link>
              <Link href="/community" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-orange-600 font-bold py-3 px-8 rounded-lg">
                Join Community
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black py-12 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src="/logo.png" alt="Audionals Logo" className="h-8 w-8 mr-2" />
                <h3 className="text-xl font-bold">Audionals</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Revolutionizing music production and rights management on the Bitcoin blockchain.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>