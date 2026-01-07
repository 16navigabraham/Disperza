"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SendSameAmountForm } from "@/components/forms/send-same-amount-form";
import { SendDifferentAmountsForm } from "@/components/forms/send-different-amounts-form";
import { SendMixedTokensForm } from "@/components/forms/send-mixed-tokens-form";

export function DispersionTabs() {
  return (
    <Tabs defaultValue="same-amount" className="w-full max-w-3xl mx-auto relative z-10">
      <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
        <TabsTrigger value="same-amount" className="py-2">Same Amount</TabsTrigger>
        <TabsTrigger value="different-amounts" className="py-2">Different Amounts</TabsTrigger>
        <TabsTrigger value="mixed-tokens" className="py-2">Mixed Tokens</TabsTrigger>
      </TabsList>
      
      <TabsContent value="same-amount">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Send Same Amount</CardTitle>
            <CardDescription>
              Disperse the same amount of a single token to multiple addresses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendSameAmountForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="different-amounts">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Send Different Amounts</CardTitle>
            <CardDescription>
              Disperse different amounts of a single token to multiple addresses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendDifferentAmountsForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mixed-tokens">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Send Mixed Tokens</CardTitle>
            <CardDescription>
              Disperse exactly 3 different tokens to 3 different addresses. Limited for this mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendMixedTokensForm />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
