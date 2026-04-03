import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { http } from 'wagmi';

const alchemyRpc = import.meta.env.VITE_ALCHEMY_RPC_URL as string | undefined;

export const config = getDefaultConfig({
  appName: 'Nerdie Blaq Clubhouse',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'PLACEHOLDER',
  chains: [base],
  transports: {
    [base.id]: http(alchemyRpc || 'https://mainnet.base.org'),
  },
});
