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
  // Local any-typed alias to access non-standard fields and methods without TS complaints
  const wp: any = walletProvider;
  
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const supportedChainIds = useMemo(() => SUPPORTED_CHAINS.map(c => c.chainId), []);
  const isWrongNetwork = useMemo(() => isConnected && chainId && !supportedChainIds.includes(chainId), [isConnected, chainId, supportedChainIds]);
  
  const dispersionContractAddress = useMemo(() => chainId ? DISPERSION_CONTRACT_ADDRESSES[chainId] : undefined, [chainId]);
  const explorerUrl = useMemo(() => chainId ? SUPPORTED_CHAINS.find(c => c.chainId === chainId)?.explorerUrl : undefined, [chainId]);

  // Detect if using embedded wallet (social login)
  const isEmbeddedWallet = useMemo(() => {
    if (!walletProvider) return false;
      // Cast to any to access non-standard provider flags exposed by some wallet adapters
      const wp: any = walletProvider;
      // Check for embedded wallet indicators
      return wp.isEmbeddedWallet === true || 
        wp.isWalletConnect === true ||
        (wp.provider && wp.provider.isEmbeddedWallet === true) ||
        wp.isCoinbaseWallet === true;
  }, [walletProvider]);

  const getSigner = useCallback(async () => {
    if (!walletProvider) throw new Error("Wallet provider not found.");
    if (!chainId || !supportedChainIds.includes(chainId)) throw new Error("Unsupported network.");
    
    const provider = new BrowserProvider(walletProvider, chainId);
    
    // For embedded wallets, don't call getSigner() directly as it triggers eth_requestAccounts
    // Instead, get it from the provider context
    if (isEmbeddedWallet) {
      try {
        // For embedded wallets, use the provider's getSignerAsync or just return provider.getSigner without request
        const signer = await provider.getSigner();
        return signer;
      } catch (error: any) {
        // Fallback: if getSigner fails, try to get signer at index 0
        if (address) {
          try {
            return await provider.getSigner(address);
          } catch {
            throw new Error("Failed to get signer from embedded wallet. Ensure you are connected.");
          }
        }
        throw error;
      }
    } else {
      // For external wallets, getSigner triggers account request which is expected
      return provider.getSigner();
    }
  }, [walletProvider, chainId, supportedChainIds, isEmbeddedWallet, address]);
  
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
                // For embedded wallets, use eth_getBalance
                const result = await walletProvider.request({
                    method: 'eth_getBalance',
                    params: [address, 'latest']
                });
                balance = BigInt(result);
            } else {
                const provider = new BrowserProvider(walletProvider);
                balance = await provider.getBalance(address);
            }
        } else {
            // ERC-20 token balance
            if (isEmbeddedWallet) {
                // For embedded wallets, use eth_call for balanceOf
                const contract = new Contract(tokenAddress, ERC20_ABI);
                const data = contract.interface.encodeFunctionData('balanceOf', [address]);
                const result = await walletProvider.request({
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
        
        // More detailed error message
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
}, [address, walletProvider, chainId, toast, isEmbeddedWallet]);

  const getAllowance = useCallback(async (tokenAddress: string) => {
    if (!address || !walletProvider || !dispersionContractAddress || !chainId) return BigInt(0);
    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    if(nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress)) {
        return MaxUint256;
    }
    try {
      const validatedAddress = getAddress(tokenAddress);
      if (isEmbeddedWallet) {
        // For embedded wallets, use eth_call for allowance
        const contract = new Contract(validatedAddress, ERC20_ABI);
        const data = contract.interface.encodeFunctionData('allowance', [address, dispersionContractAddress]);
        const result = await walletProvider.request({
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
  }, [address, walletProvider, dispersionContractAddress, chainId, isEmbeddedWallet]);

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

  // Helper to check wallet type
  const getWalletType = async () => {
    if (isEmbeddedWallet) return 'embedded';
    return 'external';
  };

  // Updated ensureWalletConnected
  const ensureWalletConnected = async () => {
    if (!isWalletReady) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet and select a supported network before sending transactions.',
      });
      throw new Error('Wallet not connected');
    }
    const walletType = await getWalletType();
    if (walletType === 'embedded') {
      // Embedded wallets do not require eth_requestAccounts or approval
      return;
    }
    // Only call eth_requestAccounts for external wallets
    if (walletType === 'external' && typeof wp?.request === 'function') {
      try {
        await wp.request({ method: 'eth_requestAccounts', params: [] });
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

  // Updated transaction logic for embedded wallets
  const tryBatchTransaction = async (calls: any[], description: string) => {
    if (!walletProvider || !address || !chainId) return null;
    const walletType = await getWalletType();
    if (walletType === 'embedded') {
      setIsLoading(true);
      setTxHash(null);
      try {
        const hexChainId = getHexChainId();
        if (!hexChainId) throw new Error('Chain ID is required for embedded wallet batch transaction.');
        const payload = {
          from: address,
          chainId: hexChainId,
          atomicRequired: true,
          calls,
        };
        // walletProvider is checked above; use `wp` alias to avoid TS undefined errors
        const res = await sendCalls(wp, payload);
        if (res?.txHash) setTxHash(res.txHash);
        toast({
          title: 'Batch Transaction Sent',
          description: `Waiting for ${description} confirmation...`,
        });
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

  // Helper: send batch calls using provider.request for embedded wallets.
  // This abstracts different provider implementations; try known methods and fall back.
  async function sendCalls(provider: any, payload: any): Promise<any> {
    if (!provider || typeof provider.request !== 'function') {
      throw new Error('Provider does not support RPC requests.');
    }

    // Try several method names that embedded providers might expose.
    const methodCandidates = ['wallet_sendCalls', 'wallet_signAndSend', 'wallet_sendTransactionBatch', 'eth_sendTransaction'];

    for (const method of methodCandidates) {
      try {
        const res = await provider.request({ method, params: [payload] });
        if (res) return res;
      } catch (e) {
        // try next candidate
      }
    }

    // As a last resort, try sending each call via eth_sendTransaction if possible (non-atomic)
    try {
      const txHashes: string[] = [];
      for (const c of payload.calls || []) {
        const single = { from: payload.from, to: c.to, data: c.data, value: c.value };
        // eth_sendTransaction expects a single tx object
        const res = await provider.request({ method: 'eth_sendTransaction', params: [single] });
        txHashes.push(res);
      }
      return { txHashes };
    } catch (e) {
      throw new Error('Provider does not support batch send methods');
    }
  }

  // Helper to check if wallet is connected and ready
  const isWalletReady = useMemo(() => {
    return !!walletProvider && !!address && !!chainId && isConnected && !isWrongNetwork;
  }, [walletProvider, address, chainId, isConnected, isWrongNetwork]);

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

    const parsedAmount = parseUnits(amount, findTokenByAddress(tokenAddress)?.decimals || 18);
    const totalAmount = parsedAmount * BigInt(recipients.length);

    const nativeTokenAddress = chainId ? NATIVE_TOKEN_ADDRESSES[chainId] : undefined;
    const isNative = nativeTokenAddress && getAddress(tokenAddress) === getAddress(nativeTokenAddress);

    const calls: any[] = [];

    if(!isNative) {
        const allowance = await getAllowance(tokenAddress);
        if (allowance < totalAmount) {
            // For embedded, batch approval
            if (walletType === 'embedded') {
                const approvalCall = {
                    to: tokenAddress,
                    value: '0x0',
                    data: new Contract(tokenAddress, ERC20_ABI).interface.encodeFunctionData('approve', [dispersionContractAddress, totalAmount]),
                };
                calls.push(approvalCall);
            } else {
                // For external, do individual approval
                const signer = await getSigner();
                const approved = await approve(tokenAddress, formatUnits(totalAmount, tokenInfo.decimals), signer);
                if (!approved) return null;
            }
        }
    }

    // Main call
    const contractTokenAddress = tokenAddress;
    const call = {
      to: dispersionContractAddress,
      value: '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendSameAmount', [contractTokenAddress, recipients, parsedAmount]),
    };
    calls.push(call);

    if (walletType === 'embedded') {
        const batchRes = await tryBatchTransaction(calls, `Dispersion of ${amount} to ${recipients.length} addresses`);
        if (!batchRes) throw new Error("Batch transaction failed for embedded wallet");
        return batchRes;
    } else {
        // External wallet: already did approval, now do transaction
        const signer = await getSigner();
        const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
        const totalValue = isNative ? totalAmount : BigInt(0);
        const contractTokenAddress2 = isNative ? '0x0000000000000000000000000000000000000000' : tokenAddress;

        return handleTransaction(
          contract.sendSameAmount(contractTokenAddress2, recipients, parsedAmount, { value: totalValue }),
          `Dispersion of ${amount} ${tokenInfo.symbol} to ${recipients.length} addresses`
        );
    }
  }, [ensureWalletConnected, getWalletType, dispersionContractAddress, chainId, getAllowance, approve, getSigner, handleTransaction]);

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

    const parsedAmounts = amounts.map((a) => parseUnits(a, findTokenByAddress(tokenAddress)?.decimals || 18));
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

    // Main call
    const contractTokenAddress = tokenAddress;
    const call = {
      to: dispersionContractAddress,
      value: '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendDifferentAmounts', [contractTokenAddress, recipients, parsedAmounts]),
    };
    calls.push(call);

    if (walletType === 'embedded') {
        const batchRes = await tryBatchTransaction(calls, `Dispersion of ${findTokenByAddress(tokenAddress)?.symbol} to ${recipients.length} addresses`);
        if (!batchRes) throw new Error("Batch transaction failed for embedded wallet");
        return batchRes;
    } else {
        const signer = await getSigner();
        const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
        const totalValue = isNative ? totalAmount : BigInt(0);
        const contractTokenAddress2 = isNative ? '0x0000000000000000000000000000000000000000' : tokenAddress;

        return handleTransaction(
          contract.sendDifferentAmounts(contractTokenAddress2, recipients, parsedAmounts, { value: totalValue }),
          `Dispersion of ${tokenInfo.symbol} to ${recipients.length} addresses`
        );
    }
  }, [ensureWalletConnected, getWalletType, dispersionContractAddress, chainId, getAllowance, approve, getSigner, handleTransaction]);

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

    // Main call
    const parsedAmounts2 = amounts.map((a, i) => parseUnits(a, findTokenByAddress(tokens[i])?.decimals || 18));
    const call = {
      to: dispersionContractAddress,
      value: '0x0',
      data: new Contract(dispersionContractAddress, DISPERSION_ABI).interface.encodeFunctionData('sendmixedTokens', [tokens, recipients, parsedAmounts2]),
    };
    calls.push(call);

    if (walletType === 'embedded') {
        const batchRes = await tryBatchTransaction(calls, `Mixed dispersion to ${recipients.length} addresses`);
        if (!batchRes) throw new Error("Batch transaction failed for embedded wallet");
        return batchRes;
    } else {
        const signer = await getSigner();
        const contract = new Contract(dispersionContractAddress, DISPERSION_ABI, signer);
        
        const contractTokens = tokens.map(t => {
          const isNative = nativeTokenAddress && getAddress(t) === getAddress(nativeTokenAddress);
          return isNative ? '0x0000000000000000000000000000000000000000' : t;
        });
        
        return handleTransaction(
          contract.sendmixedTokens(contractTokens, recipients, parsedAmounts, { value: totalValue }),
          `Mixed dispersion to ${recipients.length} addresses`
        );
    }
  }, [ensureWalletConnected, getWalletType, dispersionContractAddress, chainId, getAllowance, approve, getSigner, handleTransaction]);

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