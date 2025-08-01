/**
 * Module: BOP-Sequencer-V10-Modular/audional-base64-sample-loader.js
 * Purpose: audional-base64-sample-loader module
 * Exports: ogSampleUrls, SimpleSampleLoader
 * Depends on: sampleLoader.js
 */

// audional-base64-sample-loader.js (Optimized, with by-index API and caching)


/**
 * audional-base64-sample-loader.js
 * ------------------------------------------------------------------------
 * OG Audional Ordinals Sample Loader & Caching Utility
 *
 * This module provides:
 *   - A curated array (`ogSampleUrls`) of on-chain Ordinals sample inscriptions (music/audio, e.g., OB1 kit)
 *   - Robust utilities for fetching and decoding those samples as Web Audio `AudioBuffer` objects in the browser
 *   - By-index and batch APIs, with built-in caching for efficient interactive and real-time use
 *   - Fully browser-native (no Node dependencies), works with live URLs or on-chain Ordinals endpoints
 *
 * Core features:
 *   • Handles raw Ordinals URLs, with or without trailing hashes/queries (e.g. ...i0#)
 *   • Normalizes input URLs for reliability (production: ordinals.com, on-chain: your own gateway or domainless)
 *   • Supports JSON audioData, direct audio files, and embedded audio in HTML
 *   • Suitable for dApps, sequencers, DAWs, samplers, and interactive music/NFT projects
 *
 * Futureproofing:
 *   • To migrate to fully on-chain or gatewayless mode, adjust `normalizeOrdUrl()` to resolve content from your
 *     chosen storage or Ordinals node, removing/prepending domains as needed (see comments in code).
 *
 * Usage Example:
 *     import { SimpleSampleLoader } from './sampleLoader.js';
 *     const buffer = await SimpleSampleLoader.getSampleByIndex(0); // Loads first OB1 sample as AudioBuffer
 *
 * Author: jim.btc
 *
 * ------------------------------------------------------------------------
 */


/*****************************************************************
 * OG Audional Sample List & Dropdown
 ****************************************************************/

 // New Dropdown for Og Audional sample inscriptions
 export const ogSampleUrls = [
  { value: 'https://ordinals.com/content/e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59ad48i0#', text:'OB1 #1 - 808 Kick', duration: 1.116, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/ef5707e6ecf4d5b6edb4c3a371ca1c57b5d1057c6505ccb5f8bdc8918b0c4d94i0', text: 'OB1 #2 - 808 Snare', duration: 0.137, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0', text: 'OB1 #3 - Closed Hat', duration: 0.066, bpm: null, isLoop: false },