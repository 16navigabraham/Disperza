"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWeb3ModalAccount, useWeb3ModalProvider } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits, MaxUint256, isAddress, AbiCoder } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { DISPERSION_CONTRACT_ADDRESS, CELO_MAINNET_ID, celoMainnet } from "@/lib/constants";
import { DISPERSION_ABI, ERC20_ABI } from "@/lib/abi";
import { findTokenByAddress } from "@/lib/tokens";

export function useDispersion() {
  const { toast } = useToast();
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isWrongNetwork = useMemo(() => isConnected && chainId !== CELO_MAINNET_ID, [isConnected, chainId]);

  const getSigner = useCallback(async () => {
    if (!walletProvider) throw new Error("Wallet provider not found.");
    const provider = new BrowserProvider(walletProvider);
    return provider.getSigner();
  }, [walletProvider]);
  
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
    if (!address || !walletProvider) return "0";
    try {
      const provider = new BrowserProvider(walletProvider);
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(address);
      const tokenInfo = findTokenByAddress(tokenAddress);
      return formatUnits(balance, tokenInfo?.decimals || 18);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      return "0";
    }
  }, [address, walletProvider]);

  const getAllowance = useCallback(async (tokenAddress: string) => {
    if (!address || !walletProvider) return BigInt(0);
    try {
      const provider = new BrowserProvider(walletProvider);
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      const allowance: bigint = await tokenContract.allowance(address, DISPERSION_CONTRACT_ADDRESS);
      return allowance;
    } catch (error) {
      console.error("Failed to fetch allowance:", error);
      return BigInt(0);
    }
  }, [address, walletProvider]);

  const approve = useCallback(async (tokenAddress: string, amount: string) => {
    const signer = await getSigner();
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");
    
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
    const amountToApprove = parseUnits(amount, tokenInfo.decimals);
    
    return handleTransaction(
      tokenContract.approve(DISPERSION_CONTRACT_ADDRESS, amountToApprove),
      `Approving ${tokenInfo.symbol}`
    );
  }, [getSigner, handleTransaction]);

  const sendSameAmount = useCallback(async (tokenAddress: string, recipients: string[], amount: string) => {
    const signer = await getSigner();
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    const contract = new Contract(DISPERSION_CONTRACT_ADDRESS, DISPERSION_ABI, signer);
    const parsedAmount = parseUnits(amount, tokenInfo.decimals);

    return handleTransaction(
      contract.sendSameAmount(tokenAddress, recipients, parsedAmount),
      `Dispersion of ${amount} ${tokenInfo.symbol} to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction]);

  const sendDifferentAmounts = useCallback(async (tokenAddress: string, recipients: string[], amounts: string[]) => {
    const signer = await getSigner();
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    const contract = new Contract(DISPERSION_CONTRACT_ADDRESS, DISPERSION_ABI, signer);
    const parsedAmounts = amounts.map(a => parseUnits(a, tokenInfo.decimals));

    return handleTransaction(
      contract.sendDifferentAmounts(tokenAddress, recipients, parsedAmounts),
      `Dispersion of ${tokenInfo.symbol} to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction]);

  const sendMixedTokens = useCallback(async (tokens: string[], recipients: string[], amounts: string[]) => {
    const signer = await getSigner();

    const contract = new Contract(DISPERSION_CONTRACT_ADDRESS, DISPERSION_ABI, signer);
    const parsedAmounts = amounts.map((a, i) => {
      const tokenInfo = findTokenByAddress(tokens[i]);
      if (!tokenInfo) throw new Error(`Token at index ${i} not found`);
      return parseUnits(a, tokenInfo.decimals);
    });
    
    return handleTransaction(
      contract.sendmixedTokens(tokens, recipients, parsedAmounts),
      `Mixed dispersion to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction]);

  return {
    address,
    isConnected,
    isWrongNetwork,
    isLoading,
    txHash,
    setTxHash,
    celoExplorerUrl: celoMainnet.explorerUrl,
    getBalance,
    getAllowance,
    approve,
    sendSameAmount,
    sendDifferentAmounts,
    sendMixedTokens,
  };
}
