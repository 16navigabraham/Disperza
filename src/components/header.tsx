"use client";

import { Leaf } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <Leaf className="h-7 w-7 mr-2 text-primary" />
          <span className="font-bold text-xl">Disperza</span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <w3m-button />
        </div>
      </div>
    </header>
  );
}
