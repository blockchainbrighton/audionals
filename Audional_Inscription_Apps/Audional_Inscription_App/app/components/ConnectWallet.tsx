// app/components/ConnectWallet.tsx
'use client';

import React from 'react';
import { LEATHER, UNISAT, XVERSE, useLaserEyes } from '@omnisat/lasereyes';

const ConnectWallet = () => {
  const { connect, disconnect, connected, address, balance } = useLaserEyes();

  return (
    <div>
      {!connected ? (
        <div>
          <button onClick={() => connect(UNISAT)}>Connect Unisat Wallet</button>
          <button onClick={() => connect(XVERSE)}>Connect XVerse Wallet</button>
          <button onClick={() => connect(LEATHER)}>Connect Leather Wallet</button>
        </div>
      ) : (
        <div>
          <p>Connected Address: {address}</p>
          <p>Balance: {balance ? `${balance} satoshis` : 'Loading...'}</p>
          <button onClick={disconnect}>Disconnect Wallet</button>
        </div>
      )}
    </div>
  );
};

export default ConnectWallet;
