"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { useWeb3ModalAccount, useWeb3ModalProvider } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits, MaxUint256, getAddress } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";
import { DISPERSION_CONTRACT_ADDRESSES, SUPPORTED_CHAINS, NATIVE_TOKEN_ADDRESSES } from "@/lib/constants";
import { DISPERSION_ABI, ERC20_ABI } from "@/lib/abi";
import { findTokenByAddress } from "@/lib/tokens";

export function useDispersion() {
  const { toast } = useToast();
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  
  interface ExtendedProvider {
    request?: (args: { method: string; params?: any }) => Promise<any>;
    isEmbeddedWallet?: boolean;
    isWalletConnect?: boolean;
    provider?: any;
    isCoinbaseWallet?: boolean;
    [k: string]: any;
  }

  const wp = walletProvider as ExtendedProvider | undefined;
  
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const supportedChainIds = useMemo(() => SUPPORTED_CHAINS.map(c => c.chainId), []);
  const isWrongNetwork = useMemo(() => isConnected && chainId && !supportedChainIds.includes(chainId), [isConnected, chainId, supportedChainIds]);
  
  const dispersionContractAddress = useMemo(() => chainId ? DISPERSION_CONTRACT_ADDRESSES[chainId] : undefined, [chainId]);
  const explorerUrl = useMemo(() => chainId ? SUPPORTED_CHAINS.find(c => c.chainId === chainId)?.explorerUrl : undefined, [chainId]);

  const isEmbeddedWallet = useMemo(() => {
    if (!walletProvider) return false;
    const wp: any = walletProvider;
    return wp.isEmbeddedWallet === true || 
      wp.isWalletConnect === true ||
      (wp.provider && wp.provider.isEmbeddedWallet === true) ||
      wp.isCoinbaseWallet === true;
  }, [walletProvider]);

  if (typeof window !== 'undefined') {
    (window as any).debugReown = () => {
      console.log('Web3Modal provider debug:', {
        provider: walletProvider,
        address,
        chainId,
        isEmbedded: isEmbeddedWallet,
      });
    };
  }

  const getSigner = useCallback(async () => {
    if (!walletProvider) throw new Error("Wallet provider not found.");
    if (!chainId || !supportedChainIds.includes(chainId)) throw new Error("Unsupported network.");
    
    const provider = new BrowserProvider(walletProvider, chainId);
    
    // Call getSigner() with no parameters - this works for both embedded and external wallets
    // Passing an address parameter internally triggers eth_requestAccounts which fails for embedded wallets
    try {
      return await provider.getSigner();
    } catch (error: any) {
      console.error('Failed to get signer:', error);
      throw new Error('Failed to get signer from wallet. Please ensure you are connected.');
    }
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
      return receipt;
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
        const tokenInfo = findTokenByAddress(tokenAddress);
        let balance: bigint;

        const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
        
        if (nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress)) {
            if (isEmbeddedWallet) {
                const result = await wp?.request?.({
                    method: 'eth_getBalance',
                    params: [address, 'latest']
                });
                balance = BigInt(result);
            } else {
                const provider = new BrowserProvider(walletProvider);
                balance = await provider.getBalance(address);
            }
        } else {
            if (isEmbeddedWallet) {
                const contract = new Contract(tokenAddress, ERC20_ABI);
                const data = contract.interface.encodeFunctionData('balanceOf', [address]);
                const result = await wp?.request?.({
                    method: 'eth_call',
                    params: [{ to: tokenAddress, data }, 'latest']
                });
                balance = BigInt(result);
            } else {
                const provider = new BrowserProvider(walletProvider);
                const contract = new Contract(tokenAddress, ERC20_ABI, provider);
                balance = await contract.balanceOf(address);
            }
        }

        return formatUnits(balance, tokenInfo?.decimals || 18);
    } catch (error) {
        console.error("Failed to fetch balance:", error);
        
        let errorDesc = "Could not fetch token balance. ";
        if (error instanceof Error) {
            if (error.message.includes("could not decode result data")) {
                errorDesc += "Try refreshing the page or check the token contract address.";
            } else if (error.message.includes("invalid address")) {
                errorDesc += "Invalid token address provided.";
            } else {
                errorDesc += error.message;
            }
        }
        
        toast({
            variant: "destructive",
            title: "Balance Fetch Error",
            description: errorDesc,
        });
        return "0";
    }
}, [address, walletProvider, chainId, toast, isEmbeddedWallet, wp]);

  const getAllowance = useCallback(async (tokenAddress: string) => {
    if (!address || !walletProvider || !dispersionContractAddress || !chainId) return BigInt(0);
    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    if(nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress)) {
        return MaxUint256;
    }
    try {
      const validatedAddress = getAddress(tokenAddress);
      if (isEmbeddedWallet) {
        const contract = new Contract(validatedAddress, ERC20_ABI);
        const data = contract.interface.encodeFunctionData('allowance', [address, dispersionContractAddress]);
        const result = await wp?.request?.({
            method: 'eth_call',
            params: [{ to: validatedAddress, data }, 'latest']
        });
        return BigInt(result);
      } else {
        const provider = new BrowserProvider(walletProvider);
        const contract = new Contract(validatedAddress, ERC20_ABI, provider);
        const allowance: bigint = await contract.allowance(address, dispersionContractAddress);
        return allowance;
      }
    } catch (error) {
      console.error("Failed to fetch allowance:", error);
      return BigInt(0);
    }
  }, [address, walletProvider, dispersionContractAddress, chainId, isEmbeddedWallet, wp]);

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
        description: `${tokenInfo.symbol} approved successfully.`,
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true;
    } catch (error: any) {
      console.error(error);
      
      // Handle user rejection gracefully
      if (error?.code === 4001) {
        toast({
          variant: "destructive",
          title: "Approval Cancelled",
          description: "You cancelled the approval. Please approve to continue.",
        });
        return false;
      }
      
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

  const getWalletType = useCallback(() => {
    // Simple detection based on wallet flags - no need for async probing
    if (isEmbeddedWallet) {
      console.debug('[useDispersion] getWalletType -> embedded');
      return 'embedded';
    }
    
    console.debug('[useDispersion] getWalletType -> external');
    return 'external';
  }, [isEmbeddedWallet]);

  const isWalletReady = useMemo(() => {
    return !!walletProvider && !!address && !!chainId && isConnected && !isWrongNetwork;
  }, [walletProvider, address, chainId, isConnected, isWrongNetwork]);

  const ensureWalletConnected = useCallback(async () => {
    if (!isWalletReady) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet and select a supported network before sending transactions.',
      });
      throw new Error('Wallet not connected');
    }
    // Wallet is already connected through Web3Modal - no need to request accounts again
  }, [isWalletReady, toast]);

  // FIXED: Embedded wallets use sequential transactions instead of batch
  const executeEmbeddedTransactions = useCallback(async (calls: any[], description: string) => {
    if (!walletProvider || !address || !chainId) return null;
    
    setIsLoading(true);
    setTxHash(null);
    
    try {
      const signer = await getSigner();
      const txHashes: string[] = [];
      
      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        
        toast({
          title: `Transaction ${i + 1}/${calls.length}`,
          description: `Sending ${i === 0 && calls.length > 1 ? 'approval' : 'dispersion'} transaction...`,
        });
        
        const tx = await signer.sendTransaction({
          to: call.to,
          data: call.data,
          value: call.value || '0x0'
        });
        
        toast({
          title: `Transaction ${i + 1}/${calls.length} Sent`,
          description: 'Waiting for confirmation...',
        });
        
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error('Transaction receipt not received');
        }
        txHashes.push(receipt.hash);
        
        toast({
          title: `Transaction ${i + 1}/${calls.length} Confirmed`,
          description: `Hash: ${receipt.hash.slice(0, 10)}...`,
        });
      }
      
      setTxHash(txHashes[txHashes.length - 1]);
      
      toast({
        title: 'All Transactions Complete!',
        description: `${description} - ${txHashes.length} transaction${txHashes.length > 1 ? 's' : ''} confirmed`,
      });
      
      return { txHashes, txHash: txHashes[txHashes.length - 1] };
    } catch (err: any) {
      console.error('[useDispersion] embedded transaction failed', err);
      
      const msg = err?.message || String(err);
      
      if (err?.code === 4001 || /User rejected/.test(msg)) {
        toast({
          variant: 'destructive',
          title: 'Transaction Cancelled',
          description: 'You cancelled the transaction.',
        });
        return null;
      }
      
      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: msg || 'Transaction failed',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletProvider, address, chainId, getSigner, toast]);

  const sendSameAmount = useCallback(async (tokenAddress: string, recipients: string[], amount: string) => {
    try {
      await ensureWalletConnected();
    } catch {
      return null;
    }
    const walletType = await getWalletType();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    const parsedAmount = parseUnits(amount, tokenInfo.decimals);
    const totalAmount = parsedAmount * BigInt(recipients.length);

    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    const isNative = nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress);

    const calls: any[] = [];

    if(!isNative) {
        const allowance = await getAllowance(tokenAddress);
        if (allowance < totalAmount) {
            if (walletType === 'embedded') {
                const approvalCall = {
                    to: tokenAddress,
                    value: '0x0',
                    data: new Contract(tokenAddress, ERC20_ABI).interface.encodeFunctionData('approve', [dispersionContractAddress, totalAmount]),
                };
                calls.push(approvalCall);
            } else {
                const signer = await getSigner();
                const approved = await approve(tokenAddress, formatUnits(totalAmount, tokenInfo.decimals), signer);
                if (!approved) return null;
            }
        }
    }

    const contractTokenAddress = isNative ? '0x0000000000000000000000000000000000000000' : tokenAddress;
    const call = {
      to: dispersionContractAddress,
      value: isNative ? '0x' + totalAmount.toString(16) : '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendSameAmount', [contractTokenAddress, recipients, parsedAmount]),
    };
    calls.push(call);

    if (walletType === 'embedded') {
      return executeEmbeddedTransactions(calls, `Dispersion of ${amount} ${tokenInfo.symbol} to ${recipients.length} addresses`);
    } else {
        const signer = await getSigner();
        const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
        const totalValue = isNative ? totalAmount : BigInt(0);

        return handleTransaction(
          contract.sendSameAmount(contractTokenAddress, recipients, parsedAmount, { value: totalValue }),
          `Dispersion of ${amount} ${tokenInfo.symbol} to ${recipients.length} addresses`
        );
    }
  }, [ensureWalletConnected, getWalletType, dispersionContractAddress, chainId, getAllowance, approve, getSigner, handleTransaction, executeEmbeddedTransactions]);

  const sendDifferentAmounts = useCallback(async (tokenAddress: string, recipients: string[], amounts: string[]) => {
    try {
      await ensureWalletConnected();
    } catch {
      return null;
    }
    const walletType = await getWalletType();
    if(!dispersionContractAddress) throw new Error("Contract address not found for this network.");
    const tokenInfo = findTokenByAddress(tokenAddress);
    if (!tokenInfo) throw new Error("Token not found");

    const parsedAmounts = amounts.map((a) => parseUnits(a, tokenInfo.decimals));
    const totalAmount = parsedAmounts.reduce((sum, amount) => sum + amount, BigInt(0));

    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    const isNative = nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress);

    const calls: any[] = [];

    if(!isNative) {
        const allowance = await getAllowance(tokenAddress);
        if (allowance < totalAmount) {
            if (walletType === 'embedded') {
                const approvalCall = {
                    to: tokenAddress,
                    value: '0x0',
                    data: new Contract(tokenAddress, ERC20_ABI).interface.encodeFunctionData('approve', [dispersionContractAddress, totalAmount]),
                };
                calls.push(approvalCall);
            } else {
                const signer = await getSigner();
                const approved = await approve(tokenAddress, formatUnits(totalAmount, tokenInfo.decimals), signer);
                if (!approved) return null;
            }
        }
    }

    const contractTokenAddress = isNative ? '0x0000000000000000000000000000000000000000' : tokenAddress;
    const call = {
      to: dispersionContractAddress,
      value: isNative ? '0x' + totalAmount.toString(16) : '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendDifferentAmounts', [contractTokenAddress, recipients, parsedAmounts]),
    };
    calls.push(call);

    if (walletType === 'embedded') {
      return executeEmbeddedTransactions(calls, `Dispersion of ${tokenInfo.symbol} to ${recipients.length} addresses`);
    } else {
        const signer = await getSigner();
        const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
        const totalValue = isNative ? totalAmount : BigInt(0);

        return handleTransaction(
          contract.sendDifferentAmounts(contractTokenAddress, recipients, parsedAmounts, { value: totalValue }),
          `Dispersion of ${tokenInfo.symbol} to ${recipients.length} addresses`
        );
    }
  }, [ensureWalletConnected, getWalletType, dispersionContractAddress, chainId, getAllowance, approve, getSigner, handleTransaction, executeEmbeddedTransactions]);

  const sendMixedTokens = useCallback(async (tokens: string[], recipients: string[], amounts: string[]) => {
    try {
      await ensureWalletConnected();
    } catch {
      return null;
    }
    const walletType = await getWalletType();
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

    const calls: any[] = [];

    for (const tokenAddr in totals) {
        const isNative = nativeTokenAddress && getAddress(tokenAddr) === getAddress(nativeTokenAddress);
        if(!isNative) {
            const tokenInfo = findTokenByAddress(tokenAddr);
            const allowance = await getAllowance(tokenAddr);
            if(allowance < totals[tokenAddr]) {
                if (walletType === 'embedded') {
                    const approvalCall = {
                        to: tokenAddr,
                        value: '0x0',
                        data: new Contract(tokenAddr, ERC20_ABI).interface.encodeFunctionData('approve', [dispersionContractAddress, totals[tokenAddr]]),
                    };
                    calls.push(approvalCall);
                } else {
                    const signer = await getSigner();
                    const approved = await approve(tokenAddr, formatUnits(totals[tokenAddr], tokenInfo!.decimals), signer);
                    if(!approved) return null;
                }
            }
        }
    }

    const contractTokens = tokens.map(t => {
      const isNative = nativeTokenAddress && getAddress(t) === getAddress(nativeTokenAddress);
      return isNative ? '0x0000000000000000000000000000000000000000' : t;
    });
    
    const call = {
      to: dispersionContractAddress,
      value: totalValue > 0 ? '0x' + totalValue.toString(16) : '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendmixedTokens', [contractTokens, recipients, parsedAmounts]),
    };
    calls.push(call);

    if (walletType === 'embedded') {
        return executeEmbeddedTransactions(calls, `Mixed dispersion to ${recipients.length} addresses`);
    } else {
        const signer = await getSigner();
        const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
        
        return handleTransaction(
          contract.sendmixedTokens(contractTokens, recipients, parsedAmounts, { value: totalValue }),
          `Mixed dispersion to ${recipients.length} addresses`
        );
    }
  }, [ensureWalletConnected, getWalletType, dispersionContractAddress, chainId, getAllowance, approve, getSigner, handleTransaction, executeEmbeddedTransactions]);

  return {
    address,
    chainId,
    isConnected,
    isWrongNetwork,
    isLoading,
    txHash,
    setTxHash,
    explorerUrl,
    isEmbeddedWallet,
    getBalance,
    getAllowance,
    sendSameAmount,
    sendDifferentAmounts,
    sendMixedTokens
  };
}