// src/pages/riders/ResetPasswordResultModal.tsx
//
// Shows the temporary password returned by
// POST /v1/admin/riders/:riderId/reset-password. There's no email/SMS
// delivery channel wired up on the backend yet, so the admin needs to see
// and copy this value to relay it to the rider directly — a toast that
// auto-dismisses isn't suitable for a one-time secret like this.
import React, { useState } from 'react';
import { Copy, Check, KeyRound, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  riderName: string;
  temporaryPassword: string | null;
  onClose: () => void;
}

export default function ResetPasswordResultModal({ isOpen, riderName, temporaryPassword, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !temporaryPassword) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the value is still visible to select manually.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-800 dark:text-white">Password Reset</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">For {riderName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-2">
          <p className="text-[13px] text-slate-500 dark:text-gray-400 mb-3">
            Share this temporary password with the rider directly — there's no automatic
            email or SMS delivery yet, so this is the only place it's shown.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-gray-900/40 border border-slate-200 dark:border-gray-700">
            <code className="flex-1 text-[15px] font-mono font-semibold text-slate-800 dark:text-white tracking-wide select-all">
              {temporaryPassword}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition text-slate-500 dark:text-gray-300"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 mt-3 bg-slate-50 dark:bg-gray-900/40 border-t border-slate-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 dark:bg-gray-700 hover:bg-slate-900 dark:hover:bg-gray-600 text-white text-[13.5px] font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
