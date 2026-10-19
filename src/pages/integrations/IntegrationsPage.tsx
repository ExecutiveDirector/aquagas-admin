import { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { Copy, KeyRound, Trash2, Upload, Plug } from 'lucide-react';
import api from '../../services/api';
import { listVendors } from '../../services/vendorService';

// Onboarding tools for supermarkets: POS API keys, catalogue import, stock/price import.

type Outlet = { outlet_id: number | string; outlet_name: string };
type ApiKeyRow = {
  key_id: number | string; name: string; key_prefix: string; scopes: string; outlet_id: number | string;
  webhook_url?: string | null; last_used_at?: string | null; revoked_at?: string | null; created_at: string;
};
type ImportResult = {
  dry_run?: boolean; created?: number; updated?: number | number[]; total?: number;
  unmatched?: string[]; rejected?: { product_code: string | null; error: string }[];
};

const SCOPES = [
  { id: 'inventory:read', label: 'Read products' },
  { id: 'inventory:write', label: 'Update stock & prices' },
  { id: 'orders:read', label: 'Read orders' },
  { id: 'orders:write', label: 'Update order status' },
];

const CATALOGUE_TEMPLATE = 'product_code,product_name,category,brand,size_specification,unit_of_measure,base_price,min_price,max_price\n6161100000011,Brookside Milk 500ml,Dairy,Brookside,500ml,pieces,70,60,90\n';
const STOCK_TEMPLATE = 'product_code,stock,price\n6161100000011,120,72\n';

const BATCH = 500;
const input = 'px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 w-full';
const btn = 'px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50';

const download = (name: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};

const errMsg = (e: any, fallback: string) => e?.response?.data?.error || e?.message || fallback;

function ResultBox({ r }: { r: ImportResult | null }) {
  if (!r) return null;
  const updated = Array.isArray(r.updated) ? r.updated.length : r.updated;
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
      <p className="font-medium text-slate-800">
        {r.dry_run ? 'Check only — nothing saved yet. ' : 'Done. '}
        {r.created !== undefined && `${r.created} new, `}{updated ?? 0} updated, {(r.rejected || []).length} rejected
        {r.unmatched && r.unmatched.length > 0 ? `, ${r.unmatched.length} codes not in catalogue` : ''}.
      </p>
      {r.unmatched && r.unmatched.length > 0 && (
        <p className="text-amber-700 text-xs">Not in catalogue (import the catalogue first): {r.unmatched.slice(0, 15).join(', ')}{r.unmatched.length > 15 ? '…' : ''}</p>
      )}
      {(r.rejected || []).slice(0, 25).map((x, i) => (
        <p key={i} className="text-red-600 text-xs">{x.product_code || 'row'}: {x.error}</p>
      ))}
      {(r.rejected || []).length > 25 && <p className="text-xs text-slate-500">…and {(r.rejected || []).length - 25} more</p>}
    </div>
  );
}

/** Reads a CSV, then sends it in batches. First "Check" (dry run), then "Import". */
function CsvImporter({ title, hint, template, templateName, url, field, disabled }: {
  title: string; hint: string; template: string; templateName: string; url: string; field: 'rows' | 'items'; disabled?: boolean;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [checked, setChecked] = useState(false);

  const onFile = (f: File | undefined) => {
    setResult(null); setChecked(false);
    if (!f) return;
    Papa.parse(f, {
      header: true, skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (res) => { setRows(res.data as any[]); setFileName(f.name); },
      error: () => toast.error('Could not read that CSV file'),
    });
  };

  const run = async (dryRun: boolean) => {
    if (!rows.length) return toast.error('Choose a CSV file first');
    setBusy(true);
    const total: ImportResult = { dry_run: dryRun, created: 0, updated: 0, rejected: [], unmatched: [], total: rows.length };
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const res = await api.post(url, { [field]: rows.slice(i, i + BATCH), dry_run: dryRun });
        const d = res.data as ImportResult;
        total.created = (total.created || 0) + (d.created || 0);
        total.updated = (total.updated as number) + (Array.isArray(d.updated) ? d.updated.length : d.updated || 0);
        total.rejected!.push(...(d.rejected || []));
        total.unmatched!.push(...(d.unmatched || []));
      }
      setResult(total); setChecked(dryRun);
      if (!dryRun) { toast.success('Import finished'); setRows([]); setFileName(''); }
    } catch (e: any) {
      toast.error(errMsg(e, 'Import failed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{hint}</p>
        </div>
        <button className="text-xs text-indigo-600 whitespace-nowrap" onClick={() => download(templateName, template)}>Download template</button>
      </div>
      <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
        <label className={`${btn} border border-slate-300 text-slate-700 cursor-pointer inline-flex items-center gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="w-4 h-4" /> {fileName || 'Choose CSV file'}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {rows.length > 0 && <span className="text-xs text-slate-500">{rows.length} rows</span>}
        <div className="flex gap-2 sm:ml-auto">
          <button disabled={busy || disabled || !rows.length} onClick={() => run(true)} className={`${btn} border border-slate-300 text-slate-700`}>Check first</button>
          <button disabled={busy || disabled || !rows.length || !checked} onClick={() => run(false)} className={`${btn} bg-indigo-600 text-white`}
            title={checked ? '' : 'Run "Check first" before importing'}>Import</button>
        </div>
      </div>
      <ResultBox r={result} />
    </div>
  );
}

export default function IntegrationsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState('');
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['inventory:read', 'inventory:write', 'orders:read', 'orders:write']);
  const [webhook, setWebhook] = useState('');
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<{ api_key: string; webhook_secret?: string } | null>(null);

  useEffect(() => {
    listVendors(1, 200).then((r) => setVendors(r.data || [])).catch(() => toast.error('Could not load vendors'));
  }, []);

  const loadVendor = useCallback(async (id: string) => {
    setOutlets([]); setOutletId(''); setKeys([]); setFresh(null);
    if (!id) return;
    try {
      const [o, k] = await Promise.all([api.get(`/v1/admin/vendors/${id}/outlets`), api.get(`/v1/admin/vendors/${id}/api-keys`)]);
      setOutlets(o.data.outlets || []);
      if ((o.data.outlets || []).length === 1) setOutletId(String(o.data.outlets[0].outlet_id));
      setKeys(k.data.keys || []);
    } catch (e: any) { toast.error(errMsg(e, 'Could not load vendor integrations')); }
  }, []);

  useEffect(() => { loadVendor(vendorId); }, [vendorId, loadVendor]);

  const createKey = async () => {
    if (!outletId) return toast.error('Choose an outlet');
    if (name.trim().length < 2) return toast.error('Give the key a name, e.g. "Naivas Westlands POS"');
    if (!scopes.length) return toast.error('Choose at least one permission');
    setCreating(true);
    try {
      const res = await api.post(`/v1/admin/vendors/${vendorId}/api-keys`, {
        name: name.trim(), outlet_id: Number(outletId), scopes, webhook_url: webhook.trim() || undefined,
      });
      setFresh({ api_key: res.data.api_key, webhook_secret: res.data.webhook_secret });
      setName(''); setWebhook('');
      await loadVendor(vendorId);
      setOutletId(outletId);
    } catch (e: any) { toast.error(errMsg(e, 'Could not create the key')); }
    finally { setCreating(false); }
  };

  const revoke = async (k: ApiKeyRow) => {
    if (!window.confirm(`Revoke "${k.name}"? The POS using it stops working immediately.`)) return;
    try {
      await api.delete(`/v1/admin/vendors/${vendorId}/api-keys/${k.key_id}`);
      toast.success('Key revoked');
      loadVendor(vendorId);
    } catch (e: any) { toast.error(errMsg(e, 'Could not revoke')); }
  };

  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.success('Copied'), () => toast.error('Copy failed'));
  const active = useMemo(() => keys.filter((k) => !k.revoked_at), [keys]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2"><Plug className="w-5 h-5" /> Integrations & imports</h1>
        <p className="text-sm text-slate-500 mt-1">Onboard a supermarket: load its products, set stock and prices, and give its POS an API key.</p>
      </div>

      <CsvImporter
        title="1. Import product catalogue"
        hint="Creates or updates products by product_code (the barcode/SKU). Missing categories are created. Up to 1000 rows per batch, sent automatically."
        template={CATALOGUE_TEMPLATE} templateName="catalogue-template.csv"
        url="/v1/admin/catalogue/import" field="rows"
      />

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-semibold text-slate-800">2. Choose the supermarket</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <select className={input} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Select vendor…</option>
            {vendors.map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.business_name}</option>)}
          </select>
          <select className={input} value={outletId} onChange={(e) => setOutletId(e.target.value)} disabled={!outlets.length}>
            <option value="">{vendorId && !outlets.length ? 'No outlets for this vendor' : 'Select outlet…'}</option>
            {outlets.map((o) => <option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>)}
          </select>
        </div>
      </div>

      <CsvImporter
        title="3. Import stock & prices for this outlet"
        hint="Columns: product_code, stock, price. Prices must sit inside the product's min/max. Products must be in the catalogue first."
        template={STOCK_TEMPLATE} templateName="stock-template.csv"
        url={`/v1/admin/outlets/${outletId}/inventory/import`} field="items" disabled={!outletId}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2"><KeyRound className="w-4 h-4" /> 4. POS API keys</h3>
        {!vendorId ? <p className="text-sm text-slate-500">Select a vendor above.</p> : (
          <>
            {fresh && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
                <p className="font-medium text-amber-900">Copy these now — they will not be shown again.</p>
                <div className="flex items-center gap-2"><code className="flex-1 break-all text-xs bg-white border rounded p-2">{fresh.api_key}</code>
                  <button onClick={() => copy(fresh.api_key)} className="p-2 border rounded"><Copy className="w-4 h-4" /></button></div>
                {fresh.webhook_secret && (
                  <div className="flex items-center gap-2"><code className="flex-1 break-all text-xs bg-white border rounded p-2">{fresh.webhook_secret}</code>
                    <button onClick={() => copy(fresh.webhook_secret!)} className="p-2 border rounded"><Copy className="w-4 h-4" /></button></div>
                )}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={input} placeholder='Key name, e.g. "Naivas Westlands POS"' value={name} onChange={(e) => setName(e.target.value)} />
              <input className={input} placeholder="Webhook URL (optional, https)" value={webhook} onChange={(e) => setWebhook(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-4">
              {SCOPES.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={scopes.includes(s.id)} onChange={(e) => setScopes((p) => e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id))} />
                  {s.label}
                </label>
              ))}
            </div>
            <button disabled={creating} onClick={createKey} className={`${btn} bg-indigo-600 text-white`}>Create key</button>

            <div className="divide-y divide-slate-100">
              {active.length === 0 && <p className="text-sm text-slate-500 py-2">No active keys.</p>}
              {active.map((k) => (
                <div key={k.key_id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{k.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{k.key_prefix}… · {k.scopes}</p>
                    <p className="text-xs text-slate-400">{k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleString()}` : 'Never used'}{k.webhook_url ? ' · webhook on' : ''}</p>
                  </div>
                  <button onClick={() => revoke(k)} className="p-2 text-red-600 border border-red-200 rounded-lg" title="Revoke"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
