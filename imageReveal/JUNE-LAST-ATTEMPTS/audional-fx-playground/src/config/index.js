/**
 * Configuration Module Exports
 * Central export point for all configuration modules
 */

import AppConfig from './AppConfig.js';
import { EffectConfig, EffectDefaults, DefaultEffectOrder, EffectCategories, EffectParameterMeta } from '../effects/base/EffectConfig.js';

export { AppConfig, EffectConfig, EffectDefaults, DefaultEffectOrder, EffectCategories, EffectParameterMeta };

// Merge configurations for easy access
const Config = {
  app: AppConfig,
  effects: EffectConfig
};

export { Config };
export default Config;

