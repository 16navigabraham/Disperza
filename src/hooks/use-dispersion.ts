"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWeb3ModalAccount, useWeb3ModalProvider } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits, MaxUint256, isAddress, AbiCoder } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { DISPERSION_CONTRACT_ADDRESSES, SUPPORTED_CHAINS, NATIVE_TOKEN_ADDRESSES, CELO_MAINNET_ID, BASE_MAINNET_ID } from "@/lib/constants";
import { DISPERSION_ABI, ERC20_ABI } from "@/lib/abi";
import { findTokenByAddress } from "@/lib/tokens";

export function useDispersion() {
  const { toast } = useToast();
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const supportedChainIds = useMemo(() => SUPPORTED_CHAINS.map(c => c.chainId), []);
  const isWrongNetwork = useMemo(() => isConnected && chainId && !supportedChainIds.includes(chainId), [isConnected, chainId, supportedChainIds]);
  
  const dispersionContractAddress = useMemo(() => chainId ? DISPERSION_CONTRACT_ADDRESSES[chainId] : undefined, [chainId]);
  const explorerUrl = useMemo(() => chainId ? SUPPORTED_CHAINS.find(c => c.chainId === chainId)?.explorerUrl : undefined, [chainId]);


  const getSigner = useCallback(async () => {
    if (!walletProvider) throw new Error("Wallet provider not found.");
    if (!chainId || !supportedChainIds.includes(chainId)) throw new Error("Unsupported network.");
    const provider = new BrowserProvider(walletProvider, chainId);
    return provider.getSigner();
  }, [walletProvider, chainId, supportedChainIds]);
  
  const handleTransaction = useCallback(async (txPromise: Promise<any>, description: string) => {
    setIsLoading(true);
    setTxHash(null);
    try {
      const tx = await txPromise;
      toast({
        title: "Transaction Sent",
        description: `Waiting for ${description} confirmation...`,
      });
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      toast({
        title: "Success!",
        description: `${description} confirmed.`,
      });
      return receipt.hash;
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.info?.error?.message || error.message || "Transaction failed.";
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getBalance = useCallback(async (tokenAddress: string) => {
    if (!address || !walletProvider || !chainId) return "0";
    try {
        const provider = new BrowserProvider(walletProvider);
        const tokenInfo = findTokenByAddress(tokenAddress);
        let balance: bigint;

        const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;

        // Special handling for native tokens (ETH on Base, CELO on Celo)
        if (nativeTokenAddress && tokenAddress.toLowerCase() === nativeTokenAddress.toLowerCase()) {
            balance = await provider.getBalance(address);
        } else {
            const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
            balance = await tokenContract.balanceOf(address);
        }

        return formatUnits(balance, tokenInfo?.decimals || 18);
    } catch (error) {
        console.error("Failed to fetch balance:", error);
        toast({
            variant: "destructive",
            title: "Balance Fetch Error",
            description: "Could not fetch token balance. The token contract may not be correct.",
        });
        return "0";
    }
}, [address, walletProvider, chainId, toast]);

  const getAllowance = useCallback(async (tokenAddress: string) => {
    if (!address || !walletProvider || !dispersionContractAddress) return BigInt(0);
    try {
      const provider = new BrowserProvider(walletProvider);
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      const allowance: bigint = await tokenContract.allowance(address, dispersionContractAddress);
      return allowance;
    } catch (error) {
      console.error("Failed to fetch allowance:", error);
      return BigInt(0);
    }
  }, [address, walletProvider, dispersionContractAddress]);

  const approve = useCallback(async (tokenAddress: string, amount: string) => {
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");
    
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
    const amountToApprove = parseUnits(amount, tokenInfo.decimals);
    
    const hash = await handleTransaction(
      tokenContract.approve(dispersionContractAddress, amountToApprove),
      `Approving ${tokenInfo.symbol}`
    );

    if (hash) {
      toast({ title: "Approval Successful", description: "You can now send your tokens." });
    }
    return hash;
  }, [getSigner, handleTransaction, toast, dispersionContractAddress]);

  const sendSameAmount = useCallback(async (tokenAddress: string, recipients: string[], amount: string) => {
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
    const parsedAmount = parseUnits(amount, tokenInfo.decimals);

    return handleTransaction(
      contract.sendSameAmount(tokenAddress, recipients, parsedAmount),
      `Dispersion of ${amount} ${tokenInfo.symbol} to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction, dispersionContractAddress]);

  const sendDifferentAmounts = useCallback(async (tokenAddress: string, recipients: string[], amounts: string[]) => {
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
    const parsedAmounts = amounts.map(a => parseUnits(a, tokenInfo.decimals));

    return handleTransaction(
      contract.sendDifferentAmounts(tokenAddress, recipients, parsedAmounts),
      `Dispersion of ${tokenInfo.symbol} to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction, dispersionContractAddress]);

  const sendMixedTokens = useCallback(async (tokens: string[], recipients: string[], amounts: string[]) => {
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");

    const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
    const parsedAmounts = amounts.map((a, i) => {
      const tokenInfo = findTokenByAddress(tokens[i]);
      if (!tokenInfo) throw new Error(`Token at index ${i} not found`);
      return parseUnits(a, tokenInfo.decimals);
    });
    
    return handleTransaction(
      contract.sendmixedTokens(tokens, recipients, parsedAmounts),
      `Mixed dispersion to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction, dispersionContractAddress]);

  return {
    address,
    chainId,
    isConnected,
    isWrongNetwork,
    isLoading,
    txHash,
    setTxHash,
    explorerUrl,
    getBalance,
    getAllowance,
    approve,
    sendSameAmount,
    sendDifferentAmounts,
    sendMixedTokens
  };
}
