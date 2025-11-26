"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TransactionStatusProps {
  txHash: string;
  explorerUrl: string;
}

export function TransactionStatus({ txHash, explorerUrl }: TransactionStatusProps) {
  // Determine the explorer name based on the URL
  const getExplorerName = (url: string) => {
    if (url.includes('celoscan')) return 'Celoscan';
    if (url.includes('basescan')) return 'Basescan';
    return 'Explorer'; // Fallback
  };

  const explorerName = getExplorerName(explorerUrl);

  return (
    <div className="mt-6">
      <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <AlertTitle className="text-green-800 dark:text-green-300">Transaction Successful</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Your dispersion has been processed.
          <Link
            href={`${explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline flex items-center gap-1 mt-1 hover:text-green-900 dark:hover:text-green-200"
          >
            View on {explorerName} <ExternalLink className="h-3 w-3" />
          </Link>
        </AlertDescription>
      </Alert>
    </div>
  );
}

