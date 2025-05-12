import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

export default function Tools() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Tools - Audionals</title>
        <meta name="description" content="Explore Audionals' suite of on-chain music production tools including the BitcoinBeats Sequencer, OrdSPD, and BETA_XI Sequencer." />
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
            <h1 className="text-5xl font-bold mb-6 text-center">On-Chain Music Production Tools</h1>
            <p className="text-xl text-center max-w-3xl mx-auto">
              Create, produce, and distribute music directly on the Bitcoin blockchain with our suite of innovative tools.
            </p>
          </div>
        </section>

        {/* BitcoinBeats Sequencer Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
                <h2 className="text-4xl font-bold mb-6">BitcoinBeats Sequencer</h2>
                <p className="text-xl mb-6">
                  Our flagship on-chain digital audio workstation that allows you to create complete musical compositions directly on the Bitcoin blockchain.
                </p>
                <div className="bg-gray-800 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-4 text-orange-500">Key Features:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Multi-channel sequencing with up to 16 tracks</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Pattern-based programming with step sequencer</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Adjustable BPM, volume, and playback controls</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>On-chain sample loading and management</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save and load functionality for compositions</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Integrated rights management and attribution</span>
                    </li>
                  </ul>
                </div>
                <div className="flex space-x-4">
                  <a href="https://audionals.com/" target="_blank" rel="noopener noreferrer" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg">
                    Launch Sequencer
                  </a>
                  <Link href="/learn/bitcoinbeats" className="border border-white hover:border-orange-400 hover:text-orange-400 font-bold py-3 px-6 rounded-lg">
                    View Tutorial
                  </Link>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
                  <img src="/bitcoinbeats-screenshot.png" alt="BitcoinBeats Sequencer Interface" className="rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OrdSPD Section */}
        <section className="py-20 px-6 bg-gray-800">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row-reverse items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pl-10">
                <h2 className="text-4xl font-bold mb-6">OrdSPD (Ordinal Sample Pad)</h2>
                <p className="text-xl mb-6">
                  A regenerative Bitcoin Ordinal mixer for Audional Smart Samples. Create quick beats and patterns with this intuitive sample pad interface.
                </p>
                <div className="bg-gray-900 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-4 text-orange-500">Key Features:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Intuitive pad-based interface for triggering samples</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Direct access to on-chain Ordinal audio samples</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Quick mixing and pattern creation</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Random mix generation for inspiration</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Perfect for beginners and quick experimentation</span>
                    </li>
                  </ul>
                </div>
                <div className="flex space-x-4">
                  <a href="https://audionals.com/ordSPD/" target="_blank" rel="noopener noreferrer" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg">
                    Launch OrdSPD
                  </a>
                  <Link href="/learn/ordspd" className="border border-white hover:border-orange-400 hover:text-orange-400 font-bold py-3 px-6 rounded-lg">
                    View Tutorial
                  </Link>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="bg-gray-900 p-4 rounded-lg shadow-xl">
                  <img src="/ordspd-screenshot.png" alt="OrdSPD Interface" className="rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BETA_XI Sequencer Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
                <h2 className="text-4xl font-bold mb-6">BETA_XI Sequencer</h2>
                <p className="text-xl mb-6">
                  Our latest and most advanced sequencer with enhanced features, more presets, more sounds, and improved functionality for professional music production.
                </p>
                <div className="bg-gray-800 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-4 text-orange-500">Key Features:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Expanded sound library with premium samples</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Advanced pattern programming capabilities</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Enhanced audio manipulation tools</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Improved user interface and experience</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Comprehensive rights management system</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-orange-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Ideal for professional music producers</span>
                    </li>
                  </ul>
                </div>
                <div className="flex space-x-4">
                  <a href="https://audionals.com/BETA_XI/" target="_blank" rel="noopener noreferrer" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg">
                    Launch BETA_XI
                  </a>
                  <Link href="/learn/beta-xi" className="border border-white hover:border-orange-400 hover:text-orange-400 font-bold py-3 px-6 rounded-lg">
                    View Tutorial
                  </Link>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
                  <img src="/beta-xi-screenshot.png" alt="BETA_XI Sequencer Interface" className="rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tool Comparison Section */}
        <section className="py-20 px-6 bg-gray-800">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Tool Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-gray-900 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-6 py-4 text-left">Feature</th>
                    <th className="px-6 py-4 text-center">OrdSPD</th>
                    <th className="px-6 py-4 text-center">BitcoinBeats</th>
                    <th className="px-6 py-4 text-center">BETA_XI</th>
                  </tr>
                </<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>