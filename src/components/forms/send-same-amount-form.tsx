"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TokenSelector } from "@/components/token-selector";
import { getTokensByChain, findTokenByAddress } from "@/lib/tokens";
import { useDispersion } from "@/hooks/use-dispersion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TransactionStatus } from "./transaction-status";
import { PlusCircle, Trash2, Loader2, Wallet, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const addressSchema = z.string().refine((val) => val === "" || ethers.isAddress(val), {
  message: "Invalid address",
});

const formSchema = z.object({
  tokenAddress: z.string().min(1, "Token is required"),
  amount: z.string().refine((val) => Number(val) > 0, { message: "Amount must be > 0" }),
  recipients: z.array(z.object({ address: addressSchema }))
    .min(1, "At least one recipient is required")
    .refine(recipients => recipients.some(r => r.address && ethers.isAddress(r.address)), {
        message: "At least one valid recipient address is required."
    }),
});

export function SendSameAmountForm() {
  const dispersion = useDispersion();
  const [balance, setBalance] = useState("0");

  const tokensForChain = useMemo(() => getTokensByChain(dispersion.chainId), [dispersion.chainId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenAddress: "",
      amount: "",
      recipients: [{ address: "" }],
    },
  });

  useEffect(() => {
    if (tokensForChain.length > 0 && !form.getValues('tokenAddress')) {
      form.reset({
        tokenAddress: tokensForChain[0].address,
        amount: "",
        recipients: [{ address: "" }]
      });
    } else if (tokensForChain.length > 0 && !tokensForChain.find(t => t.address === form.getValues('tokenAddress'))) {
        form.reset({
            tokenAddress: tokensForChain[0].address,
            amount: "",
            recipients: [{ address: "" }]
          });
    }
  }, [tokensForChain, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "recipients",
  });

  const tokenAddress = form.watch("tokenAddress");
  const amount = form.watch("amount");
  const recipients = form.watch("recipients");

  const totalAmount = useMemo(() => {
    const numAmount = Number(amount) || 0;
    const numRecipients = recipients.filter(r => r.address && ethers.isAddress(r.address)).length;
    return numAmount * numRecipients;
  }, [amount, recipients]);

  const selectedToken = useMemo(() => findTokenByAddress(tokenAddress), [tokenAddress]);

  const totalAmountParsed = useMemo(() => {
    try {
      return ethers.parseUnits(totalAmount.toString(), selectedToken?.decimals || 18);
    } catch {
      return BigInt(0);
    }
  }, [totalAmount, selectedToken]);

  const hasSufficientBalance = useMemo(() => {
    try {
      const balanceParsed = ethers.parseUnits(balance, selectedToken?.decimals || 18);
      return balanceParsed >= totalAmountParsed;
    } catch {
      return false;
    }
  }, [balance, totalAmountParsed, selectedToken]);
  
  useEffect(() => {
    if (!dispersion.isConnected || !tokenAddress) return;
    dispersion.getBalance(tokenAddress).then(setBalance);
  }, [dispersion.isConnected, dispersion.chainId, tokenAddress, dispersion.getBalance]);

  async function handleApprove() {
    await dispersion.approve(tokenAddress, totalAmount.toString());
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const recipientAddresses = values.recipients.map(r => r.address).filter((a): a is string => !!a && ethers.isAddress(a));
    const hash = await dispersion.sendSameAmount(values.tokenAddress, recipientAddresses, values.amount);
    if(hash) {
      form.reset({
        tokenAddress: values.tokenAddress,
        amount: "",
        recipients: [{ address: "" }],
      });
      if (dispersion.isConnected && values.tokenAddress) {
        dispersion.getBalance(values.tokenAddress).then(setBalance);
      }
    }
  }

  if (!dispersion.isConnected) {
    return (
      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertTitle>Wallet Not Connected</AlertTitle>
        <AlertDescription>Please connect your wallet to use the dispersion tool.</AlertDescription>
      </Alert>
    );
  }

  if (dispersion.isWrongNetwork) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Wrong Network</AlertTitle>
        <AlertDescription>Please switch to a supported network (Celo or Base).</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tokenAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token</FormLabel>
                  <TokenSelector
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                    }}
                    disabled={dispersion.isLoading}
                    tokens={tokensForChain}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount per Recipient</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.0"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                      disabled={dispersion.isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormLabel>Recipients</FormLabel>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Enter recipient addresses before entering the amount to see the correct total.
            </p>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`recipients.${index}.address`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input placeholder="0x..." {...field} onChange={(e) => {
                              field.onChange(e);
                              form.trigger('recipients');
                          }}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1 || dispersion.isLoading}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ address: "" })}
              className="mt-2"
              disabled={dispersion.isLoading}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Recipient
            </Button>
          </div>
          
          <Separator />
          
          <div className="p-4 rounded-md bg-muted/50 space-y-3">
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Your Balance</span>
                <span className="font-medium">{parseFloat(balance).toFixed(4)} {selectedToken?.symbol}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total to Send</span>
                <span className="font-medium">{totalAmount.toFixed(4)} {selectedToken?.symbol}</span>
             </div>
              {!hasSufficientBalance && totalAmount > 0 && (
                 <p className="text-destructive text-xs text-center pt-2">Insufficient balance.</p>
              )}
          </div>

          <div className="flex flex-col gap-4">
            <Button type="button" onClick={handleApprove} disabled={dispersion.isLoading || !hasSufficientBalance || totalAmount <= 0} className="w-full">
                {dispersion.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Approve {selectedToken?.symbol}
            </Button>
            <Button type="submit" disabled={dispersion.isLoading || !hasSufficientBalance || totalAmount <= 0} className="w-full">
              {dispersion.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send
            </Button>
          </div>
        </form>
      </Form>
      {dispersion.txHash && dispersion.explorerUrl && <TransactionStatus txHash={dispersion.txHash} explorerUrl={dispersion.explorerUrl} />}
    </>
  );
}
