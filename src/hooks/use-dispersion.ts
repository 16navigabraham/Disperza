"use client";

import { useState, useCallback, useMemo } from "react";
import { useWeb3ModalAccount, useWeb3ModalProvider } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits, MaxUint256, getAddress } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { DISPERSION_CONTRACT_ADDRESSES, SUPPORTED_CHAINS, NATIVE_TOKEN_ADDRESSES } from "@/lib/constants";
import { DISPERSION_ABI, ERC20_ABI } from "@/lib/abi";
import { findTokenByAddress } from "@/lib/tokens";
import { getWalletCapabilities, sendCalls } from '@/lib/eip5792';

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
    
    setIsLoading(true);
    setTxHash(null);
    
    try {
      const tx = await tokenContract.approve(dispersionContractAddress, amountToApprove);
      
      toast({
        title: "Approval Transaction Sent",
        description: `Waiting for ${tokenInfo.symbol} approval confirmation...`,
      });
      
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);
      
      toast({
        title: "Approval Confirmed!",
        description: `${tokenInfo.symbol} approved successfully. Transaction hash: ${receipt.hash.slice(0, 10)}...`,
      });
      
      // Wait for user acknowledgment before proceeding
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true;
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.info?.error?.message || error.message || "Approval failed.";
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: errorMessage,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispersionContractAddress, toast]);

  // Helper to get hex chainId
  const getHexChainId = () => {
    if (!chainId) return undefined;
    return '0x' + chainId.toString(16);
  };

  // EIP-5792 batch transaction wrapper
  const tryBatchTransaction = async (calls: any[], description: string) => {
    if (!walletProvider || !address || !chainId) return null;
    const caps = await getWalletCapabilities(walletProvider);
    if (caps?.atomic === 'supported') {
      setIsLoading(true);
      setTxHash(null);
      try {
        const payload = {
          from: address,
          chainId: getHexChainId(),
          atomicRequired: true,
          calls,
        };
        const res = await sendCalls(walletProvider, payload);
        if (res?.txHash) setTxHash(res.txHash);
        toast({
          title: 'Batch Transaction Sent',
          description: `Waiting for ${description} confirmation...`,
        });
        // Optionally poll getCallsStatus here
        return res;
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Batch Transaction Failed',
          description: err?.message || 'Batch transaction failed.',
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    }
    return null;
  };

  // Helper to check wallet connection and capabilities
  const ensureWalletConnected = async () => {
    if (!walletProvider || !address) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet before sending transactions.',
      });
      throw new Error('Wallet not connected');
    }
    // Detect EIP-5792 smart account
    let isSmartAccount = false;
    if (typeof walletProvider.request === 'function') {
      try {
        const caps = await getWalletCapabilities(walletProvider);
        if (caps?.atomic) isSmartAccount = true;
      } catch {}
    }
    // Only call eth_requestAccounts for external wallets
    if (!isSmartAccount && typeof walletProvider.request === 'function') {
      try {
        await walletProvider.request({ method: 'eth_requestAccounts', params: [] });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Wallet Access Denied',
          description: 'Your wallet did not allow access. Please approve connection or use a compatible wallet.',
        });
        throw err;
      }
    }
  };

  // Patch sendSameAmount
  const sendSameAmount = useCallback(async (tokenAddress: string, recipients: string[], amount: string) => {
    try {
      await ensureWalletConnected();
    } catch {
      return null;
    }
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    // Prepare call for batch
    const contractTokenAddress = tokenAddress;
    const parsedAmount = parseUnits(amount, findTokenByAddress(tokenAddress)?.decimals || 18);
    const call = {
      to: dispersionContractAddress,
      value: '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendSameAmount', [contractTokenAddress, recipients, parsedAmount]),
    };
    const batchRes = await tryBatchTransaction([call], `Dispersion of ${amount} to ${recipients.length} addresses`);
    if (batchRes) return batchRes;

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
    const contractTokenAddress2 = isNative ? '0x0000000000000000000000000000000000000000' : tokenAddress;

    return handleTransaction(
      contract.sendSameAmount(contractTokenAddress2, recipients, parsedAmount, { value: totalValue }),
      `Dispersion of ${amount} ${tokenInfo.symbol} to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction, dispersionContractAddress, chainId, getAllowance, approve]);

  // Patch sendDifferentAmounts
  const sendDifferentAmounts = useCallback(async (tokenAddress: string, recipients: string[], amounts: string[]) => {
    try {
      await ensureWalletConnected();
    } catch {
      return null;
    }
    const signer = await getSigner();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    // Prepare call for batch
    const contractTokenAddress = tokenAddress;
    const parsedAmounts = amounts.map((a) => parseUnits(a, findTokenByAddress(tokenAddress)?.decimals || 18));
    const call = {
      to: dispersionContractAddress,
      value: '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendDifferentAmounts', [contractTokenAddress, recipients, parsedAmounts]),
    };
    const batchRes = await tryBatchTransaction([call], `Dispersion of ${findTokenByAddress(tokenAddress)?.symbol} to ${recipients.length} addresses`);
    if (batchRes) return batchRes;

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
    const contractTokenAddress2 = isNative ? '0x0000000000000000000000000000000000000000' : tokenAddress;

    return handleTransaction(
      contract.sendDifferentAmounts(contractTokenAddress2, recipients, parsedAmounts, { value: totalValue }),
      `Dispersion of ${tokenInfo.symbol} to ${recipients.length} addresses`
    );
  }, [getSigner, handleTransaction, dispersionContractAddress, chainId, getAllowance, approve]);

  // Patch sendMixedTokens
  const sendMixedTokens = useCallback(async (tokens: string[], recipients: string[], amounts: string[]) => {
    try {
      await ensureWalletConnected();
    } catch {
      return null;
    }
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
    
    // Prepare call for batch
    const parsedAmounts2 = amounts.map((a, i) => parseUnits(a, findTokenByAddress(tokens[i])?.decimals || 18));
    const call = {
      to: dispersionContractAddress,
      value: '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendmixedTokens', [tokens, recipients, parsedAmounts2]),
    };
    const batchRes = await tryBatchTransaction([call], `Mixed dispersion to ${recipients.length} addresses`);
    if (batchRes) return batchRes;

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
