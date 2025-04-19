# Bitcoin Ordinals and On-Chain Music

## What are Bitcoin Ordinals?

Bitcoin Ordinals is a protocol launched in January 2023 by developer Casey Rodarmor. It exploits a loophole in Bitcoin's 2021 Taproot upgrade, enabling the inscription of various data file formats directly onto the Bitcoin blockchain. Each Ordinal is tied to a single satoshi (the smallest unit of Bitcoin, 1/100,000,000 BTC).

Ordinals have unlocked a growing economy of NFT-like asset trading on Bitcoin, including artwork, games, and music. As of July 2023, more than 14.6 million Ordinals had been inscribed on the Bitcoin blockchain.

## Recursive Inscriptions

A key innovation in the Ordinals ecosystem is "recursive inscriptions." Previously, inscriptions were siloed and could not interact with one another. With recursive inscriptions, Ordinals can "call" data from already-inscribed assets on the blockchain, similar to the composability of Ethereum protocols.

This allows Ordinals developers to circumvent the 4MB block storage limitations of Bitcoin inscriptions, which is particularly important for media-rich applications like music and games.

Benefits of recursive inscriptions:
- Drastically reduces the costs of inscribing on-chain projects
- Allows developers to scale inscription data at the base blockchain layer
- Enables reuse of pre-inscribed code for future projects
- Makes it economically feasible to put larger media files on Bitcoin

For example, a developer might pay $40 worth of Bitcoin in network fees for the first inscription containing core code, but then only $5 for subsequent inscriptions that reference the original code.

## On-Chain Music Applications

The "Descent Into Darkness Music Engine" was one of the first fully on-chain music engines inscribed onto the Bitcoin blockchain. By entering keywords, anyone can generate a unique music track directly on the blockchain.

This demonstrates how recursive inscriptions can be used to create interactive music applications on Bitcoin, opening up new possibilities for musicians and developers.
