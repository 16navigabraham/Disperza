"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TokenSelector } from "@/components/token-selector";
import { CELO_TOKENS, findTokenByAddress } from "@/lib/tokens";
import { useDispersion } from "@/hooks/use-dispersion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TransactionStatus } from "./transaction-status";
import { Loader2, Wallet, AlertCircle } from "lucide-react";
import { Separator } from "../ui/separator";

const addressSchema = z.string().refine((val) => ethers.isAddress(val), { message: "Invalid address" });
const amountSchema = z.string().refine((val) => Number(val) > 0, { message: "Amount > 0" });
const tokenSchema = z.string().min(1, "Token required");

const formSchema = z.object({
  entries: z.array(z.object({
    tokenAddress: tokenSchema,
    recipient: addressSchema,
    amount: amountSchema,
  })).length(3, "Exactly 3 entries are required"),
}).refine(data => {
  const tokens = data.entries.map(e => e.tokenAddress);
  return new Set(tokens).size === tokens.length;
}, {
  message: "Tokens must be unique",
  path: ["entries"],
});

type FormValues = z.infer<typeof formSchema>;

export function SendMixedTokensForm() {
  const dispersion = useDispersion();
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [allowances, setAllowances] = useState<Record<string, bigint>>({});
  const [tokensToApprove, setTokensToApprove] = useState<string[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entries: [
        { tokenAddress: CELO_TOKENS[0].address, recipient: "", amount: "" },
        { tokenAddress: CELO_TOKENS[1].address, recipient: "", amount: "" },
        { tokenAddress: CELO_TOKENS[2].address, recipient: "", amount: "" },
      ],
    },
  });

  const entries = form.watch("entries");

  const totals = useMemo(() => {
    return entries.reduce((acc, entry) => {
        if(entry.tokenAddress) {
            acc[entry.tokenAddress] = (acc[entry.tokenAddress] || 0) + (Number(entry.amount) || 0);
        }
        return acc;
    }, {} as Record<string, number>);
  }, [entries]);

  const updateBalancesAndAllowances = useCallback(async () => {
    if (!dispersion.isConnected) return;
    const tokens = [...new Set(entries.map(e => e.tokenAddress).filter(Boolean))];
    const newBalances: Record<string, string> = {};
    const newAllowances: Record<string, bigint> = {};
    for (const token of tokens) {
        newBalances[token] = await dispersion.getBalance(token);
        newAllowances[token] = await dispersion.getAllowance(token);
    }
    setBalances(newBalances);
    setAllowances(newAllowances);
  }, [dispersion, entries]);

  useEffect(() => {
    updateBalancesAndAllowances();
  }, [updateBalancesAndAllowances]);

  useEffect(() => {
    const toApprove: string[] = [];
    for(const tokenAddress in totals) {
        const total = totals[tokenAddress];
        const token = findTokenByAddress(tokenAddress);
        const allowance = allowances[tokenAddress] || BigInt(0);
        try {
            const totalParsed = ethers.parseUnits(total.toString(), token?.decimals || 18);
            if (allowance < totalParsed) {
                toApprove.push(tokenAddress);
            }
        } catch {}
    }
    setTokensToApprove(toApprove);
  }, [totals, allowances]);

  const hasSufficientBalance = useMemo(() => {
    for(const tokenAddress in totals) {
        const balance = balances[tokenAddress] || "0";
        const token = findTokenByAddress(tokenAddress);
        try {
            const balanceParsed = ethers.parseUnits(balance, token?.decimals || 18);
            const totalParsed = ethers.parseUnits(totals[tokenAddress].toString(), token?.decimals || 18);
            if(balanceParsed < totalParsed) return false;
        } catch { return false; }
    }
    return true;
  }, [balances, totals]);

  async function handleApprove(tokenAddress: string) {
    const total = totals[tokenAddress] || 0;
    const approvalAmount = total * 1.1;
    const hash = await dispersion.approve(tokenAddress, approvalAmount.toString());
    if (hash) {
      updateBalancesAndAllowances();
    }
  }

  async function onSubmit(values: FormValues) {
    const tokens = values.entries.map(e => e.tokenAddress);
    const recipients = values.entries.map(e => e.recipient);
    const amounts = values.entries.map(e => e.amount);
    const hash = await dispersion.sendMixedTokens(tokens, recipients, amounts);
    if(hash) {
      form.reset();
      updateBalancesAndAllowances();
    }
  }

  if (!dispersion.isConnected) return <Alert><Wallet className="h-4 w-4" /><AlertTitle>Wallet Not Connected</AlertTitle><AlertDescription>Please connect your wallet.</AlertDescription></Alert>;
  if (dispersion.isWrongNetwork) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Wrong Network</AlertTitle><AlertDescription>Please switch to the Celo mainnet.</AlertDescription></Alert>;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {form.getValues('entries').map((_, index) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/20 space-y-4">
                <FormField control={form.control} name={`entries.${index}.tokenAddress`} render={({ field }) => <FormItem><FormLabel>Token {index + 1}</FormLabel><TokenSelector value={field.value} onChange={field.onChange} disabled={dispersion.isLoading} /><FormMessage /></FormItem>} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name={`entries.${index}.recipient`} render={({ field }) => <FormItem><FormLabel>Recipient {index + 1}</FormLabel><FormControl><Input placeholder="0x..." {...field} disabled={dispersion.isLoading} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name={`entries.${index}.amount`} render={({ field }) => <FormItem><FormLabel>Amount {index + 1}</FormLabel><FormControl><Input type="number" placeholder="0.0" {...field} disabled={dispersion.isLoading} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>
            ))}
             {form.formState.errors.entries?.message && <p className="text-sm font-medium text-destructive">{form.formState.errors.entries.message}</p>}
          </div>

          <Separator />

          <div className="p-4 rounded-md bg-muted/50 space-y-3">
            <h3 className="font-medium">Summary</h3>
            {Object.keys(totals).length > 0 ? (
                Object.entries(totals).map(([tokenAddr, total]) => {
                    const token = findTokenByAddress(tokenAddr);
                    return (
                        <div key={tokenAddr} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total {token?.symbol}</span>
                            <span className="font-medium">{total.toFixed(4)} {token?.symbol}</span>
                        </div>
                    )
                })
            ) : <p className="text-sm text-muted-foreground">Fill out the form to see a summary.</p>}
             {!hasSufficientBalance && <p className="text-destructive text-xs text-center pt-2">Insufficient balance for one or more tokens.</p>}
          </div>

          <div className="flex flex-col gap-4">
            {tokensToApprove.map(tokenAddress => (
              <Button key={tokenAddress} type="button" onClick={() => handleApprove(tokenAddress)} disabled={dispersion.isLoading || !hasSufficientBalance} className="w-full">
                {dispersion.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Approve {findTokenByAddress(tokenAddress)?.symbol}
              </Button>
            ))}
            <Button type="submit" disabled={dispersion.isLoading || tokensToApprove.length > 0 || !hasSufficientBalance} className="w-full">
              {dispersion.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send
            </Button>
          </div>
        </form>
      </Form>
      {dispersion.txHash && <TransactionStatus txHash={dispersion.txHash} explorerUrl={dispersion.celoExplorerUrl} />}
    </>
  );
}
