/**
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Import modules
const {
    PluginRegistry,
    BaseInstrument,
    ExtensionRegistry,
    pluginRegistry,
    extensionRegistry
} = await import('../src/sequencer-plugin-api.js');

describe('Plugin API', () => {
    let registry;

    beforeEach(() => {
        registry = new PluginRegistry();
    });

    describe('PluginRegistry', () => {
        describe('registerInstrument', () => {
            test('registers valid instrument plugin', () => {
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth',
                        version: '1.0.0',
                        description: 'Test synthesizer',
                        author: 'Test Author'
                    },
                    createInstrument: jest.fn()
                };

                expect(() => registry.registerInstrument(plugin)).not.toThrow();
                expect(registry.instruments.has('test-synth')).toBe(true);
                expect(registry.loadedPlugins).toContain('test-synth');
            });

            test('rejects plugin with missing manifest', () => {
                const plugin = {
                    createInstrument: jest.fn()
                };

                expect(() => registry.registerInstrument(plugin)).toThrow('Plugin must have a manifest object');
            });

            test('rejects plugin with missing required fields', () => {
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth'
                        // Missing version, description, author
                    },
                    createInstrument: jest.fn()
                };

                expect(() => registry.registerInstrument(plugin)).toThrow('Plugin manifest missing required field');
            });

            test('rejects plugin without createInstrument function', () => {
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth',
                        version: '1.0.0',
                        description: 'Test synthesizer',
                        author: 'Test Author'
                    }
                };

                expect(() => registry.registerInstrument(plugin)).toThrow('Instrument plugin must have createInstrument function');
            });

            test('rejects duplicate plugin registration', () => {
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth',
                        version: '1.0.0',
                        description: 'Test synthesizer',
                        author: 'Test Author'
                    },
                    createInstrument: jest.fn()
                };

                registry.registerInstrument(plugin);
                expect(() => registry.registerInstrument(plugin)).toThrow("Instrument plugin 'test-synth' already registered");
            });

            test('validates API version compatibility', () => {
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth',
                        version: '1.0.0',
                        description: 'Test synthesizer',
                        author: 'Test Author',
                        api: {
                            min: '2.0.0',
                            max: '3.0.0'
                        }
                    },
                    createInstrument: jest.fn()
                };

                expect(() => registry.registerInstrument(plugin)).toThrow('Plugin API version incompatible');
            });
        });

        describe('registerEffect', () => {
            test('registers valid effect plugin', () => {
                const plugin = {
                    manifest: {
                        id: 'test-reverb',
                        name: 'Test Reverb',
                        version: '1.0.0',
                        description: 'Test reverb effect',
                        author: 'Test Author'
                    },
                    createEffect: jest.fn()
                };

                expect(() => registry.registerEffect(plugin)).not.toThrow();
                expect(registry.effects.has('test-reverb')).toBe(true);
            });

            test('rejects effect without createEffect function', () => {
                const plugin = {
                    manifest: {
                        id: 'test-reverb',
                        name: 'Test Reverb',
                        version: '1.0.0',
                        description: 'Test reverb effect',
                        author: 'Test Author'
                    }
                };

                expect(() => registry.registerEffect(plugin)).toThrow('Effect plugin must have createEffect function');
            });
        });

        describe('createInstrument', () => {
            test('creates instrument instance', () => {
                const mockInstance = { id: 'test-instance' };
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth',
                        version: '1.0.0',
                        description: 'Test synthesizer',
                        author: 'Test Author'
                    },
                    createInstrument: jest.fn().mockReturnValue(mockInstance)
                };

                registry.registerInstrument(plugin);
                const result = registry.createInstrument('test-synth', { param: 'value' });

                expect(result.instance).toBe(mockInstance);
                expect(result.instanceId).toMatch(/^test-synth_\d+_[a-z0-9]+$/);
                expect(plugin.createInstrument).toHaveBeenCalledWith({ param: 'value' });
                expect(registry.instances.has(result.instanceId)).toBe(true);
            });

            test('throws error for unknown plugin', () => {
                expect(() => registry.createInstrument('unknown-plugin')).toThrow("Instrument plugin 'unknown-plugin' not found");
            });

            test('handles creation errors', () => {
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth',
                        version: '1.0.0',
                        description: 'Test synthesizer',
                        author: 'Test Author'
                    },
                    createInstrument: jest.fn().mockImplementation(() => {
                        throw new Error('Creation failed');
                    })
                };

                registry.registerInstrument(plugin);
                expect(() => registry.createInstrument('test-synth')).toThrow("Failed to create instrument 'test-synth': Creation failed");
            });
        });

        describe('getAvailableInstruments', () => {
            test('returns array of instrument manifests', () => {
                const plugin1 = {
                    manifest: {
                        id: 'synth1',
                        name: 'Synth 1',
                        version: '1.0.0',
                        description: 'First synthesizer',
                        author: 'Author 1'
                    },
                    createInstrument: jest.fn()
                };

                const plugin2 = {
                    manifest: {
                        id: 'synth2',
                        name: 'Synth 2',
                        version: '1.0.0',
                        description: 'Second synthesizer',
                        author: 'Author 2'
                    },
                    createInstrument: jest.fn()
                };

                registry.registerInstrument(plugin1);
                registry.registerInstrument(plugin2);

                const manifests = registry.getAvailableInstruments();
                expect(manifests).toHaveLength(2);
                expect(manifests[0]).toBe(plugin1.manifest);
                expect(manifests[1]).toBe(plugin2.manifest);
            });
        });

        describe('disposeInstance', () => {
            test('disposes instance with dispose method', () => {
                const mockInstance = {
                    dispose: jest.fn()
                };
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth',
                        version: '1.0.0',
                        description: 'Test synthesizer',
                        author: 'Test Author'
                    },
                    createInstrument: jest.fn().mockReturnValue(mockInstance)
                };

                registry.registerInstrument(plugin);
                const { instanceId } = registry.createInstrument('test-synth');

                registry.disposeInstance(instanceId);

                expect(mockInstance.dispose).toHaveBeenCalled();
                expect(registry.instances.has(instanceId)).toBe(false);
            });

            test('handles missing instance gracefully', () => {
                expect(() => registry.disposeInstance('non-existent')).not.toThrow();
            });

            test('handles disposal errors', () => {
                const mockInstance = {
                    dispose: jest.fn().mockImplementation(() => {
                        throw new Error('Disposal failed');
                    })
                };
                const plugin = {
                    manifest: {
                        id: 'test-synth',
                        name: 'Test Synth',
                        version: '1.0.0',
                        description: 'Test synthesizer',
                        author: 'Test Author'
                    },
                    createInstrument: jest.fn().mockReturnValue(mockInstance)
                };

                registry.registerInstrument(plugin);
                const { instanceId } = registry.createInstrument('test-synth');

                expect(() => registry.disposeInstance(instanceId)).not.toThrow();
            });
        });

        describe('getStatistics', () => {
            test('returns plugin statistics', () => {
                const stats = registry.getStatistics();

                expect(stats).toHaveProperty('totalPlugins');
                expect(stats).toHaveProperty('instruments');
                expect(stats).toHaveProperty('effects');
                expect(stats).toHaveProperty('transports');
                expect(stats).toHaveProperty('activeInstances');
                expect(stats).toHaveProperty('apiVersion');
                expect(stats.apiVersion).toBe('1.0.0');
            });
        });
    });

    describe('BaseInstrument', () => {
        let instrument;

        beforeEach(() => {
            instrument = new BaseInstrument({ testParam: 'value' });
        });

        test('initializes with config', () => {
            expect(instrument.config.testParam).toBe('value');
            expect(instrument.isInitialized).toBe(false);
            expect(instrument.parameters).toBeInstanceOf(Map);
        });

        test('merges with default config', () => {
            class TestInstrument extends BaseInstrument {
                getDefaultConfig() {
                    return { defaultParam: 'default', testParam: 'override' };
                }
            }

            const testInst = new TestInstrument({ testParam: 'value' });
            expect(testInst.config.defaultParam).toBe('default');
            expect(testInst.config.testParam).toBe('value'); // User config overrides default
        });

        describe('initialize', () => {
            test('initializes instrument', async () => {
                await instrument.initialize();

                expect(instrument.isInitialized).toBe(true);
            });

            test('prevents double initialization', async () => {
                await instrument.initialize();
                await instrument.initialize(); // Should not throw

                expect(instrument.isInitialized).toBe(true);
            });

            test('calls _doInitialize', async () => {
                const spy = jest.spyOn(instrument, '_doInitialize');
                await instrument.initialize();

                expect(spy).toHaveBeenCalled();
            });
        });

        describe('trigger', () => {
            test('triggers when initialized', async () => {
                const spy = jest.spyOn(instrument, '_doTrigger');
                await instrument.initialize();

                instrument.trigger(0, { note: 'C4' });

                expect(spy).toHaveBeenCalledWith(0, { note: 'C4' });
            });

            test('warns when not initialized', () => {
                const spy = jest.spyOn(instrument, '_doTrigger');

                instrument.trigger(0, { note: 'C4' });

                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe('parameters', () => {
            test('sets and gets parameters', () => {
                const spy = jest.spyOn(instrument, '_onParameterChange');

                instrument.setParameter('volume', 0.8);

                expect(instrument.getParameter('volume')).toBe(0.8);
                expect(spy).toHaveBeenCalledWith('volume', 0.8);
            });

            test('gets all parameters', () => {
                instrument.setParameter('volume', 0.8);
                instrument.setParameter('pan', 0.5);

                const params = instrument.getAllParameters();

                expect(params).toEqual({ volume: 0.8, pan: 0.5 });
            });
        });

        describe('dispose', () => {
            test('cleans up resources', () => {
                const listener = jest.fn();
                instrument.eventListeners.push(listener);
                instrument.setParameter('test', 'value');

                instrument.dispose();

                expect(listener).toHaveBeenCalled();
                expect(instrument.eventListeners).toHaveLength(0);
                expect(instrument.parameters.size).toBe(0);
                expect(instrument.isInitialized).toBe(false);
            });

            test('handles listener errors', () => {
                const errorListener = jest.fn(() => {
                    throw new Error('Listener error');
                });
                instrument.eventListeners.push(errorListener);

                expect(() => instrument.dispose()).not.toThrow();
            });
        });
    });

    describe('ExtensionRegistry', () => {
        let extensions;

        beforeEach(() => {
            extensions = new ExtensionRegistry();
        });

        describe('hooks', () => {
            test('adds and executes hooks', () => {
                const hook = jest.fn().mockReturnValue('result');

                extensions.addHook('test-hook', hook);
                const result = extensions.executeHook('test-hook', 'arg1', 'arg2');

                expect(hook).toHaveBeenCalledWith('arg1', 'arg2');
                expect(result).toBe('result');
            });

            test('returns undefined for missing hooks', () => {
                const result = extensions.executeHook('missing-hook');
                expect(result).toBeUndefined();
            });

            test('handles hook errors', () => {
                const errorHook = jest.fn(() => {
                    throw new Error('Hook error');
                });

                extensions.addHook('error-hook', errorHook);
                const result = extensions.executeHook('error-hook');

                expect(result).toBeUndefined();
            });

            test('rejects non-function hooks', () => {
                expect(() => extensions.addHook('test', 'not-a-function')).toThrow('Hook callback must be a function');
            });
        });

        describe('filters', () => {
            test('adds and applies filters', () => {
                const filter1 = jest.fn(value => value + 1);
                const filter2 = jest.fn(value => value * 2);

                extensions.addFilter('test-filter', filter1);
                extensions.addFilter('test-filter', filter2);

                const result = extensions.applyFilters('test-filter', 5);

                expect(result).toBe(12); // (5 + 1) * 2
                expect(filter1).toHaveBeenCalledWith(5);
                expect(filter2).toHaveBeenCalledWith(6);
            });

            test('returns original value for missing filters', () => {
                const result = extensions.applyFilters('missing-filter', 'value');
                expect(result).toBe('value');
            });

            test('handles filter errors', () => {
                const errorFilter = jest.fn(() => {
                    throw new Error('Filter error');
                });

                extensions.addFilter('error-filter', errorFilter);
                const result = extensions.applyFilters('error-filter', 'value');

                expect(result).toBe('value'); // Returns original value on error
            });

            test('rejects non-function filters', () => {
                expect(() => extensions.addFilter('test', 'not-a-function')).toThrow('Filter callback must be a function');
            });
        });

        describe('actions', () => {
            test('adds and executes actions', () => {
                const action1 = jest.fn();
                const action2 = jest.fn();

                extensions.addAction('test-action', action1);
                extensions.addAction('test-action', action2);

                extensions.executeActions('test-action', 'arg1', 'arg2');

                expect(action1).toHaveBeenCalledWith('arg1', 'arg2');
                expect(action2).toHaveBeenCalledWith('arg1', 'arg2');
            });

            test('handles missing actions gracefully', () => {
                expect(() => extensions.executeActions('missing-action')).not.toThrow();
            });

            test('handles action errors', () => {
                const errorAction = jest.fn(() => {
                    throw new Error('Action error');
                });

                extensions.addAction('error-action', errorAction);

                expect(() => extensions.executeActions('error-action')).not.toThrow();
            });

            test('rejects non-function actions', () => {
                expect(() => extensions.addAction('test', 'not-a-function')).toThrow('Action callback must be a function');
            });
        });
    });

    describe('Global Instances', () => {
        test('exports global plugin registry', () => {
            expect(pluginRegistry).toBeInstanceOf(PluginRegistry);
        });

        test('exports global extension registry', () => {
            expect(extensionRegistry).toBeInstanceOf(ExtensionRegistry);
        });
    });
});

