// Character token-bound accounts (ERC-6551) are paused.
//
// The deployed registry (VITE_ERC6551_REGISTRY) builds every account from truncated bytecode: the
// account that exists on-chain (character #0) is 26 bytes long, has no owner, and cannot move
// anything, and every other computed address would deploy the same way. Anything sent to any of these
// addresses would be lost for good. Until accounts move to an audited registry and implementation,
// the site must not compute, show, link, or offer to copy these addresses.
export const TBA_ACCOUNTS_ENABLED = false;

export const TBA_PAUSED_TITLE = 'Character wallet: coming soon';
export const TBA_PAUSED_NOTICE =
  'Character wallets are paused while we upgrade them. Do not send ETH, NERDIE, or NFTs to any account address previously shown for this NFT.';
