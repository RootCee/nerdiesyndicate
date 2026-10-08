import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { parseEther, type Abi, type Hash } from 'viem';
import contractABI from '../contractABI';
import { BASE_CHAIN_ID, CONTRACTS } from '../lib/contracts';

const SYNDICATE_ABI = contractABI as Abi;
const PRICE_PER_NFT = parseEther('0.01');

function getReadableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'The wallet request failed. Please try again.';
}

export function useSyndicateMint() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContractAsync, isPending: isSubmitting } = useWriteContract();
  const [transactionHash, setTransactionHash] = useState<Hash | undefined>();
  const [actionError, setActionError] = useState<string | null>(null);

  const totalSupplyQuery = useReadContract({
    address: CONTRACTS.NFT,
    abi: SYNDICATE_ABI,
    functionName: 'totalSupply',
    chainId: BASE_CHAIN_ID,
  });
  const maxSupplyQuery = useReadContract({
    address: CONTRACTS.NFT,
    abi: SYNDICATE_ABI,
    functionName: 'MAX_SUPPLY',
    chainId: BASE_CHAIN_ID,
  });
  const ownedBalanceQuery = useReadContract({
    address: CONTRACTS.NFT,
    abi: SYNDICATE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: Boolean(address),
    },
  });
  const walletBalanceQuery = useBalance({
    address,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: Boolean(address),
    },
  });
  const receiptQuery = useWaitForTransactionReceipt({
    hash: transactionHash,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: Boolean(transactionHash),
    },
  });

  useEffect(() => {
    if (!receiptQuery.isSuccess) return;
    void totalSupplyQuery.refetch();
    void maxSupplyQuery.refetch();
    void ownedBalanceQuery.refetch();
    void walletBalanceQuery.refetch();
  }, [receiptQuery.isSuccess]);

  const readError = useMemo(() => {
    const error = totalSupplyQuery.error || maxSupplyQuery.error || ownedBalanceQuery.error;
    return error ? getReadableError(error) : null;
  }, [maxSupplyQuery.error, ownedBalanceQuery.error, totalSupplyQuery.error]);

  async function switchToBase() {
    setActionError(null);
    try {
      await switchChainAsync({ chainId: BASE_CHAIN_ID });
    } catch (error) {
      setActionError(getReadableError(error));
    }
  }

  async function mint(quantity: number) {
    setActionError(null);

    if (!isConnected || !address) {
      setActionError('Connect a wallet before minting.');
      return;
    }

    if (chainId !== BASE_CHAIN_ID) {
      setActionError('Switch your connected wallet to Base before minting.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
      setActionError('Choose a mint quantity between 1 and 5.');
      return;
    }

    const value = PRICE_PER_NFT * BigInt(quantity);
    if (walletBalanceQuery.data && walletBalanceQuery.data.value < value) {
      setActionError('You do not have enough ETH on Base for this mint, excluding gas.');
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.NFT,
        abi: SYNDICATE_ABI,
        functionName: 'mint',
        args: [address, BigInt(quantity)],
        value,
        chainId: BASE_CHAIN_ID,
        account: address,
      });
      setTransactionHash(hash);
    } catch (error) {
      setActionError(getReadableError(error));
    }
  }

  return {
    address,
    isConnected,
    isOnBase: chainId === BASE_CHAIN_ID,
    totalSupply:
      typeof totalSupplyQuery.data === 'bigint' ? Number(totalSupplyQuery.data) : null,
    maxSupply: typeof maxSupplyQuery.data === 'bigint' ? Number(maxSupplyQuery.data) : null,
    ownedBalance:
      typeof ownedBalanceQuery.data === 'bigint' ? Number(ownedBalanceQuery.data) : null,
    pricePerNft: '0.01',
    supplyLoading: totalSupplyQuery.isLoading || maxSupplyQuery.isLoading,
    readError,
    actionError,
    transactionHash,
    transactionPending: isSubmitting || receiptQuery.isLoading,
    transactionConfirmed: receiptQuery.isSuccess,
    isSwitchingChain,
    switchToBase,
    mint,
  };
}
