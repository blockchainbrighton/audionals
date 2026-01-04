import * as Connect from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { Buffer } from 'buffer';

import { createJourneyLog } from '../shared/logging/journeyLog.js';
import { createAuthFeature } from '../features/auth/authFeature.js';
import { createContractService } from '../stacks/contractService.js';
import { getContractDetailsFromUi } from './contractConfig.js';
import { createMintState } from '../features/mint/mintState.js';
import { createFeeFeature } from '../features/fees/feeFeature.js';
import { createMintFeature } from '../features/mint/mintFeature.js';
import { createViewerFeature } from '../features/viewer/viewerFeature.js';
import { installNavigation } from '../features/navigation/navigation.js';
import { getFeePerTxMicroStx } from '../features/mint/settings.js';

export function initApp() {
  window.Buffer = Buffer;

  const journeyLog = createJourneyLog();
  journeyLog('App loading...');

  const appConfig = new Connect.AppConfig(['store_write', 'publish_data']);
  const userSession = new Connect.UserSession({ appConfig });
  const network = new StacksTestnet({ url: 'https://api.testnet.hiro.so' });
  journeyLog('Network configured', { url: network.coreApiUrl });

  const mintState = createMintState();

  let mintFeatureRef = null;
  const feeFeature = createFeeFeature({
    journeyLog,
    network,
    mintState,
    onFeeChanged: () => {
      mintFeatureRef?.renderMintFileStats();
    },
    onSafeModeChanged: () => {
      mintFeatureRef?.handleSafeModeChanged();
    },
    onProgressMessage: (html) => {
      mintFeatureRef?.renderMintProgress(html);
    },
  });

  const authFeature = createAuthFeature({ Connect, userSession, journeyLog });
  const contractService = createContractService({
    network,
    userSession,
    journeyLog,
    getFeePerTxMicroStx,
    getContractDetails: () => getContractDetailsFromUi({ journeyLog }),
  });
  const viewerFeature = createViewerFeature({ journeyLog, network, contractService });
  const mintFeature = createMintFeature({
    journeyLog,
    userSession,
    network,
    ensureAuth: authFeature.ensureAuth,
    contractService,
    feeFeature,
    mintState,
  });
  mintFeatureRef = mintFeature;

  feeFeature.initFromStorage();
  feeFeature.registerHandlers();

  mintFeature.init();
  mintFeature.registerHandlers();

  viewerFeature.init();
  viewerFeature.registerHandlers();

  document.getElementById('btn-deploy-contract')?.addEventListener('click', async () => {
    journeyLog("User clicked 'Deploy Contract'");
    try {
      await authFeature.ensureAuth({ action: 'deploy the contract' });
    } catch (e) {
      journeyLog('Deploy blocked (auth not completed)', { error: e?.message || String(e) });
      return;
    }
    await contractService.deployCoreContract();
  });

  installNavigation({
    journeyLog,
    onShow: {
      mint: () => {
        void feeFeature.maybeFetchFeeRates({ maxAgeMs: 60_000 }).then((updated) => {
          if (updated) feeFeature.renderFeeEstimates({ mode: 'mint', missingCount: null });
        });
        mintFeature.onShowMintPage();
      },
      play: () => {
        viewerFeature.onShowPlayPage();
      },
    },
  });

  void authFeature.init();
  authFeature.registerHandlers();
}
