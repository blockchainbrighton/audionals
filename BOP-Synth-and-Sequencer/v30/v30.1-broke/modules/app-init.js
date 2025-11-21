import { startSequencerApp } from './sequencer/sequencer-main.js';

const hasWindow = typeof window !== 'undefined';
const hasDocument = typeof document !== 'undefined';
const autoStartEnabled = hasWindow && hasDocument && !globalThis.__BOP_DISABLE_AUTO_START__;

async function bootstrap() {
    try {
        await startSequencerApp({ document, window });
    } catch (error) {
        console.error('[BOP Matrix] Failed to start application:', error);
    }
}

if (autoStartEnabled) {
    bootstrap();
}

export { startSequencerApp };
