import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

export default function Technology() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Technology - Audionals</title>
        <meta name="description" content="Learn about the technology behind Audionals, including the protocol, on-chain sequencer, and JSON standard." />
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
            <h1 className="text-5xl font-bold mb-6 text-center">Our Technology</h1>
            <p className="text-xl text-center max-w-3xl mx-auto">
              Discover the innovative technology behind Audionals that's revolutionizing music production and rights management on the Bitcoin blockchain.
            </p>
          </div>
        </section>

        {/* Protocol Overview Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
                <h2 className="text-4xl font-bold mb-6">The Audionals Protocol</h2>
                <p className="text-xl mb-6">
                  Audionals is a pioneering protocol that transforms music production, distribution, and rights management by offering an on-chain digital audio workstation (DAW) built on the Bitcoin blockchain.
                </p>
                <p className="text-xl mb-6">
                  By fully operating within a decentralized on-chain environment, Audionals redefines Web3 music creation, collaboration, and ownership. This entirely on-chain approach guarantees that every facet of music creation, collaboration, and ownership is securely managed and transparently documented on the blockchain.
                </p>
                <p className="text-xl">
                  The result is an immutable and trustless ecosystem for artists and producers, eliminating the need for traditional intermediaries and contractual agreements.
                </p>
              </div>
              <div className="md:w-1/2">
                <img src="/protocol-diagram.png" alt="Audionals Protocol Diagram" className="rounded-lg shadow-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* On-Chain Sequencer Section */}
        <section className="py-20 px-6 bg-gray-800">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">On-Chain Sequencer</h2>
            <div className="flex flex-col md:flex-row-reverse items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pl-10">
                <h3 className="text-3xl font-bold mb-6">BitcoinBeats Sequencer</h3>
                <p className="text-xl mb-6">
                  The Audionals on-chain sequencer is a digital audio workstation (DAW) built directly on the Bitcoin blockchain using the Ordinals protocol. It allows musicians to create, produce, and distribute music in a decentralized environment.
                </p>
                <p className="text-xl mb-6">
                  Unlike traditional DAWs that store files locally or in centralized cloud services, the Audionals sequencer operates entirely on-chain, with all components of the music production process stored on the Bitcoin blockchain.
                </p>
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h4 className="text-xl font-bold mb-4 text-orange-500">Key Features:</h4>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Multi-channel sequencing with pattern programming</li>
                    <li>On-chain audio sample storage and retrieval</li>
                    <li>Integrated rights management and attribution</li>
                    <li>Adjustable BPM, volume, and playback controls</li>
                    <li>Save and load functionality for compositions</li>
                  </ul>
                </div>
              </div>
              <div className="md:w-1/2">
                <img src="/sequencer-screenshot.png" alt="BitcoinBeats Sequencer Interface" className="rounded-lg shadow-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* JSON Standard Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">JSON Standard</h2>
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
                <h3 className="text-3xl font-bold mb-6">Comprehensive Data Structure</h3>
                <p className="text-xl mb-6">
                  The Audionals protocol introduces a comprehensive JSON structure for capturing every essential detail of a digital audio file, incorporating audio and exhaustive metadata into a single, on-chain playable file.
                </p>
                <p className="text-xl mb-6">
                  What truly sets this format apart is the integration of base64 audio-encoding within the JSON file itself. This eliminates the need for separate metadata files when current options are restrictive in standards like mp3, wav, or flac, creating more efficient files for integration into dApps with on-chain capabilities.
                </p>
                <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto">
                  <pre className="text-sm text-green-400">
{`{
  "metadata": {
    "title": "Sample Track",
    "artist": "Bitcoin Producer",
    "created": "2025-03-15T12:00:00Z",
    "bpm": 120,
    "rights": {
      "owner": "bc1q...wallet_address",
      "contributors": [
        {"role": "producer", "wallet": "bc1q...address1"},
        {"role": "sample_creator", "wallet": "bc1q...address2"}
      ]
    }
  },
  "tracks": [
    {
      "id": "track_001",
      "name": "Drums",
      "samples": [
        {
          "id": "sample_001",
          "inscription_id": "abc123...",
          "pattern": [1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0]
        }
      ]
    }
  ],
  "audio_data": "base64_encoded_audio_content..."
}`}
                  </pre>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="bg-gray-800 p-8 rounded-lg">
                  <h4 className="text-2xl font-bold mb-6 text-orange-500">Benefits of Our JSON Standard</h4>
                  <div className="space-y-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h5 className="text-lg font-medium">Integrated Audio Encoding</h5>
                        <p className="text-gray-300">Base64 audio encoding within the JSON file eliminates the need for separate files.</p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h5 className="text-lg font-medium">Comprehensive Metadata</h5>
                        <p className="text-gray-300">Captures all essential details including technical information, contextual insights, and rights management.</p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h5 className="text-lg font-medium">Cross-Platform Compatibility</h5>
                        <p className="text-gray-300">Enhances compatibility across diverse platforms, software, and devices.</p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h5 className="text-lg font-medium">Permanent Storage</h5>
                        <p className="text-gray-300">Establishes a new benchmark for permanent audio file storage and indexing for future access.</p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h5 className="text-lg font-medium">Global Audio Repository</h5>
                        <p className="text-gray-300">With UTF-8 encoding, creates a global resource library that transcends language barriers.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bitcoin Integration Section */}
        <section className="py-20 px-6 bg-gray-800">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Bitcoin Blockchain Integration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-900 p-8 rounded-lg">
                <div className="text-orange-500 text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">Ordinals Protocol</h3>
                <p className="text-gray-300">
                  Audionals leverages Bitcoin's Ordinals protocol to inscribe and recursively access and sequence on-chain audio files. This allows for permanent, immutable storage of audio data directly on the Bitcoin blockchain.
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-lg">
                <div className="text-orange-500 text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">Wallet Integration</h3>
                <p className="text-gray-300">
                  Every element involved in a song's creation is owned and held within individual Bitcoin wallets. The song file itself serves as an immutable Merkle tree that references each component's wallet address and rights holder.
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-lg">
                <div className="text-orange-500 text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">On-Chain Execution</h3>
                <p className="text-gray-300">
                  When executed, the JSON files programmatically generate the song using on-chain resources. This ensures that the entire music creation and playback process happens directly on the Bitcoin blockchain.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Diagram Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">How It All Works Together</h2>
            <div className="bg-gray-800 p-8 rounded-lg">
              <img src="/technical-diagram.png" alt="Audionals Technical Architecture" className="w-full rounded-lg" />
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-orange-500">Creation</h3>
                  <p className="text-gray-300">
                    Artists use the Audionals sequence<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>