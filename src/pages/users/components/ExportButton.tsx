import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Download, FileText, Database, Check, ChevronDown, AlertTriangle,
} from "lucide-react";
import type { User } from "../../../types";

interface Props {
  users: User[];
  disabled?: boolean;
  className?: string;
}

type Format   = "csv" | "json";
type Progress = "idle" | "working" | "done" | "error";

const getFullName = (u: User) => {
  if (u.fullName) return u.fullName;
  return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "";
};

const ExportButton: React.FC<Props> = ({ users, disabled = false, className = "" }) => {
  const [format,   setFormat]   = useState<Format>("csv");
  const [progress, setProgress] = useState<Progress>("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const canExport = users.length > 0 && !disabled && progress !== "working";

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => () => { clearTimeout(timerRef.current); }, []);

  const download = useCallback((blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const buildCSV = useCallback(() => {
    const headers = ["Full Name", "Email", "Phone", "Role", "Status", "Joined"];
    const rows = users.map(u => [
      getFullName(u),
      u.email        ?? "",
      u.phone_number ?? "",
      u.role         ?? "",
      u.status       ?? "",
      u.created_at ? new Date(u.created_at).toLocaleDateString("en-KE") : "",
    ]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
    return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  }, [users]);

  const buildJSON = useCallback(() => {
    const data = {
      exported_at: new Date().toISOString(),
      total: users.length,
      users: users.map(u => ({
        id:           u.id,
        name:         getFullName(u),
        email:        u.email,
        phone_number: u.phone_number,
        role:         u.role,
        status:       u.status,
        wallet_balance: u.walletBalance,
        last_login:   u.lastLogin,
        joined:       u.created_at,
      })),
    };
    return new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
  }, [users]);

  const handleExport = useCallback(async () => {
    if (!canExport) return;
    try {
      setProgress("working");
      await new Promise(r => setTimeout(r, 600));
      const date = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        download(buildCSV(), `aquagas_users_${date}.csv`);
      } else {
        download(buildJSON(), `aquagas_users_${date}.json`);
      }
      setProgress("done");
      timerRef.current = setTimeout(() => setProgress("idle"), 2500);
    } catch {
      setProgress("error");
      timerRef.current = setTimeout(() => setProgress("idle"), 3000);
    }
  }, [canExport, format, buildCSV, buildJSON, download]);

  const isWorking = progress === "working";
  const isDone    = progress === "done";
  const isError   = progress === "error";

  return (
    <div
      className={`inline-flex items-center gap-0 rounded-xl overflow-hidden
                  border border-slate-200 shadow-sm ${className}`}
    >
      {/* Main export button */}
      <button
        onClick={handleExport}
        disabled={!canExport}
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-semibold
                    transition-all duration-150 focus:outline-none
                    ${!canExport
                      ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                      : isDone
                        ? "bg-emerald-50 text-emerald-700"
                        : isError
                          ? "bg-rose-50 text-rose-600"
                          : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
      >
        {isWorking ? (
          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : isDone ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : isError ? (
          <AlertTriangle className="w-3.5 h-3.5" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {isWorking
          ? "Exporting…"
          : isDone
            ? "Exported!"
            : isError
              ? "Failed"
              : `Export ${format.toUpperCase()}`}
        {!isWorking && !isDone && !isError && users.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-bold">
            {users.length}
          </span>
        )}
      </button>

      {/* Divider */}
      <div className="w-px bg-slate-200 self-stretch" />

      {/* Format picker */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(p => !p)}
          disabled={!canExport}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold
                      transition-all duration-150 focus:outline-none
                      ${!canExport
                        ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                        : menuOpen
                          ? "bg-slate-100 text-slate-700"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
        >
          {format === "csv"
            ? <FileText className="w-3.5 h-3.5" />
            : <Database className="w-3.5 h-3.5" />}
          {format.toUpperCase()}
          <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200
                        rounded-xl shadow-xl z-30 overflow-hidden py-1.5"
          >
            {(["csv", "json"] as Format[]).map(f => (
              <button
                key={f}
                onClick={() => { setFormat(f); setMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px]
                            font-medium transition-colors duration-100
                            ${format === f
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-700 hover:bg-slate-50"
                            }`}
              >
                <div className="flex items-center gap-2.5">
                  {f === "csv"
                    ? <FileText className="w-3.5 h-3.5 text-slate-400" />
                    : <Database className="w-3.5 h-3.5 text-slate-400" />}
                  <div>
                    <p className="leading-tight">{f.toUpperCase()}</p>
                    <p className="text-[11px] text-slate-400 leading-tight font-normal">
                      {f === "csv" ? "Spreadsheet-ready" : "Structured JSON"}
                    </p>
                  </div>
                </div>
                {format === f && <Check className="w-3.5 h-3.5 text-indigo-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportButton;
