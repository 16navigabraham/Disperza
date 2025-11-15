"use client";

import { useState, useCallback, useMemo } from "react";
import { useWeb3ModalAccount, useWeb3ModalProvider } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits, MaxUint256, getAddress } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { DISPERSION_CONTRACT_ADDRESSES, SUPPORTED_CHAINS, NATIVE_TOKEN_ADDRESSES } from "@/lib/constants";
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
  
  const handleTransaction = useCallback(async (txPromise: Promise<any>, description: string, successMessage?: string) => {
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
        description: successMessage || `${description} confirmed.`,
      });
      return receipt; // Return the full receipt
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
        
        if (nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress)) {
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
    if (!address || !walletProvider || !dispersionContractAddress || !chainId) return BigInt(0);
    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    if(nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress)) {
        return MaxUint256;
    }
    try {
      const provider = new BrowserProvider(walletProvider);
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      const allowance: bigint = await tokenContract.allowance(address, dispersionContractAddress);
      return allowance;
    } catch (error) {
      console.error("Failed to fetch allowance:", error);
      return BigInt(0);
    }
  }, [address, walletProvider, dispersionContractAddress, chainId]);

  const approve = useCallback(async (tokenAddress: string, amount: string, signer: any) => {
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");
    
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
    const amountToApprove = parseUnits(amount, tokenInfo.decimals);
    
    const receipt = await handleTransaction(
      tokenContract.approve(dispersionContractAddress, amountToApprove),
      `Approving ${tokenInfo.symbol}`,
      `Approved ${tokenInfo.symbol}. Now sending...`
    );

    return !!receipt;
  }, [handleTransaction, dispersionContractAddress]);

  const sendSameAmount = useCallback(async (tokenAddress: string, recipients: string[], amount: string) => {
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    const parsedAmount = parseUnits(amount, tokenInfo.decimals);
    const totalAmount = parsedAmount * BigInt(recipients.length);
    
    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    const isNative = nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress);
    
    if(!isNative) {
        const allowance = await getAllowance(tokenAddress);
        if (allowance < totalAmount) {
            const approved = await approve(tokenAddress, formatUnits(totalAmount, tokenInfo.decimals), signer);
            if (!approved) return null;
        }
    }

    const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
    const totalValue = isNative ? totalAmount : BigInt(0);
    const contractTokenAddress = isNative ? '0x0000000000000000000000000000000000000000' : tokenAddress;

    return handleTransaction(
      contract.sendSameAmount(contractTokenAddress, recipients, parsedAmount, { value: totalValue }),
      `Dispersion of ${amount} ${tokenInfo.symbol} to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction, dispersionContractAddress, chainId, getAllowance, approve]);

  const sendDifferentAmounts = useCallback(async (tokenAddress: string, recipients: string[], amounts: string[]) => {
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    const parsedAmounts = amounts.map(a => parseUnits(a, tokenInfo.decimals));
    const totalAmount = parsedAmounts.reduce((sum, amount) => sum + amount, BigInt(0));

    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    const isNative = nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress);

    if(!isNative) {
        const allowance = await getAllowance(tokenAddress);
        if (allowance < totalAmount) {
            const approved = await approve(tokenAddress, formatUnits(totalAmount, tokenInfo.decimals), signer);
            if (!approved) return null;
        }
    }

    const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
    const totalValue = isNative ? totalAmount : BigInt(0);
    const contractTokenAddress = isNative ? '0x0000000000000000000000000000000000000000' : tokenAddress;

    return handleTransaction(
      contract.sendDifferentAmounts(contractTokenAddress, recipients, parsedAmounts, { value: totalValue }),
      `Dispersion of ${tokenInfo.symbol} to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction, dispersionContractAddress, chainId, getAllowance, approve]);

  const sendMixedTokens = useCallback(async (tokens: string[], recipients: string[], amounts: string[]) => {
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");

    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    let totalValue = BigInt(0);

    const entries = tokens.map((t, i) => ({
      tokenAddress: t,
      recipient: recipients[i],
      amount: amounts[i],
    }));

    const totals: Record<string, bigint> = {};
    const parsedAmounts = entries.map(entry => {
        const tokenInfo = findTokenByAddress(entry.tokenAddress);
        if (!tokenInfo) throw new Error(`Token at ${entry.tokenAddress} not found`);
        const parsedAmount = parseUnits(entry.amount, tokenInfo.decimals);
        
        totals[entry.tokenAddress] = (totals[entry.tokenAddress] || BigInt(0)) + parsedAmount;

        const isNative = nativeTokenAddress && getAddress(entry.tokenAddress) === getAddress(nativeTokenAddress);
        if (isNative) {
            totalValue += parsedAmount;
        }
        return parsedAmount;
    });

    for (const tokenAddr in totals) {
        const isNative = nativeTokenAddress && getAddress(tokenAddr) === getAddress(nativeTokenAddress);
        if(!isNative) {
            const tokenInfo = findTokenByAddress(tokenAddr);
            const allowance = await getAllowance(tokenAddr);
            if(allowance < totals[tokenAddr]) {
                const approved = await approve(tokenAddr, formatUnits(totals[tokenAddr], tokenInfo!.decimals), signer);
                if(!approved) return null;
            }
        }
    }

    const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
    
    // Convert native token addresses to zero address for contract calls
    const contractTokens = tokens.map(t => {
      const isNative = nativeTokenAddress && getAddress(t) === getAddress(nativeTokenAddress);
      return isNative ? '0x0000000000000000000000000000000000000000' : t;
    });
    
    return handleTransaction(
      contract.sendmixedTokens(contractTokens, recipients, parsedAmounts, { value: totalValue }),
      `Mixed dispersion to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction, dispersionContractAddress, chainId, getAllowance, approve]);

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
    sendSameAmount,
    sendDifferentAmounts,
    sendMixedTokens
  };
}
