"use client";

import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CELO_TOKENS, Token } from "@/lib/tokens";

interface TokenSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  tokens?: Token[];
  placeholder?: string;
}

export function TokenSelector({
  value,
  onChange,
  disabled,
  tokens = CELO_TOKENS,
  placeholder = "Select a token"
}: TokenSelectorProps) {

  const selectedToken = tokens.find(t => t.address === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
         <SelectValue placeholder={placeholder}>
          {selectedToken && (
             <div className="flex items-center gap-2">
              <Image
                src={selectedToken.logo}
                alt={selectedToken.name}
                width={20}
                height={20}
                className="rounded-full"
              />
              <span>{selectedToken.symbol}</span>
            </div>
          )}
         </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tokens.map((token: Token) => (
          <SelectItem key={token.address} value={token.address}>
            <div className="flex items-center gap-2">
              <Image
                src={token.logo}
                alt={token.name}
                width={20}
                height={20}
                className="rounded-full"
              />
              <span>{token.symbol} ({token.name})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
