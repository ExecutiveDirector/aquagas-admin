import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, Search, Users, TrendingUp, Handshake, Clock, AlertCircle, FileText, Download, Send, Reply, Sparkles } from "lucide-react";
import { OUTREACH_LEADS } from "./outreachData";
import type { OutreachLead } from "./outreachData";

// ======================================================
// Types & constants
// ======================================================

type LeadStatus = "Not Contacted" | "Contacted" | "Interested" | "Not Interested" | "Partnered";
type ReplyStatus = "No Reply" | "Replied - Positive" | "Replied - Negative" | "Replied - Needs Follow-up";

interface TrackerRow {
  status: LeadStatus;
  first: string;
  f1: string;
  f2: string;
  reply: ReplyStatus;
  notes: string;
}

const DEFAULT_TEMPLATE =
  "Hi, this is [Your Name] from AquaGas 👋 We supply cooking gas, drinking water, kitchenware & household essentials at competitive wholesale prices with reliable delivery. Would {business} be open to a quick chat about becoming a partner retailer? You can reach me on [Your Number] / [Your WhatsApp]. Thank you!";

const STORAGE_KEY = "aquagas-outreach-tracker";
const TEMPLATE_KEY = "aquagas-outreach-template";

const PROPOSAL_PDF_PATH = "/documents/AquaGas-Vendor-Partnership-Proposal.pdf";
const APPLICATION_FORM_PDF_PATH = "/documents/AquaGas-Vendor-Application-Form.pdf";

function proposalWaLink(lead: OutreachLead): string | null {
  if (!lead.phone) return null;
  const digits = lead.phone.replace(/[^0-9]/g, "");
  if (digits.length < 9) return null;
  const proposalUrl = `${window.location.origin}${PROPOSAL_PDF_PATH}`;
  const msg = encodeURIComponent(
    `Hi, this is [Your Name] from AquaGas 👋 Following up with our vendor partnership proposal for ${lead.name} — here it is: ${proposalUrl}. Happy to answer any questions on WhatsApp or a quick call.`
  );
  return `https://wa.me/${digits}?text=${msg}`;
}

const FIT_STYLES: Record<string, string> = {
  High: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Medium-High": "bg-lime-50 text-lime-700 border-lime-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  "Not Contacted": "text-slate-400",
  Contacted: "text-indigo-600 font-medium",
  Interested: "text-emerald-600 font-semibold",
  "Not Interested": "text-rose-500",
  Partnered: "text-emerald-700 font-bold",
};

const REPLY_STYLES: Record<ReplyStatus, string> = {
  "No Reply": "text-slate-400",
  "Replied - Positive": "text-emerald-600 font-semibold",
  "Replied - Negative": "text-rose-500",
  "Replied - Needs Follow-up": "text-amber-600 font-medium",
};

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function waLink(lead: OutreachLead, template: string): string | null {
  if (!lead.phone) return null;
  const digits = lead.phone.replace(/[^0-9]/g, "");
  if (digits.length < 9) return null;
  const msg = encodeURIComponent(template.replace("{business}", lead.name));
  return `https://wa.me/${digits}?text=${msg}`;
}

function telLink(lead: OutreachLead): string | null {
  if (!lead.phone) return null;
  return `tel:${lead.phone.replace(/\s+/g, "")}`;
}

// ======================================================
// Component
// ======================================================

export default function OutreachPage() {
  const [tracker, setTracker] = useState<Record<string, TrackerRow>>({});
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [search, setSearch] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fFit, setFFit] = useState("");
  const [fCounty, setFCounty] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fReply, setFReply] = useState("");
  const [fDue, setFDue] = useState("");

  // Load persisted tracker state + template
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTracker(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    try {
      const t = localStorage.getItem(TEMPLATE_KEY);
      if (t) setTemplate(t);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: Record<string, TrackerRow>) => {
    setTracker(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const getRow = (lead: OutreachLead): TrackerRow =>
    tracker[slug(lead.name)] ?? { status: "Not Contacted", first: "", f1: "", f2: "", reply: "No Reply", notes: "" };

  const categories = useMemo(
    () => [...new Set(OUTREACH_LEADS.map((l) => l.category))].sort(),
    []
  );

  const today = todayStr();

  const stats = useMemo(() => {
    let contacted = 0,
      interested = 0,
      partnered = 0,
      dueToday = 0,
      overdue = 0,
      highFit = 0,
      gasDealers = 0,
      replied = 0;
    OUTREACH_LEADS.forEach((l) => {
      const r = getRow(l);
      if (r.status !== "Not Contacted") contacted++;
      if (r.status === "Interested") interested++;
      if (r.status === "Partnered") partnered++;
      if (l.fit === "High") highFit++;
      if (l.category === "Gas Dealer") gasDealers++;
      if (r.reply && r.reply !== "No Reply") replied++;
      if (r.status === "Contacted") {
        [r.f1, r.f2].forEach((d) => {
          if (d && d < today) overdue++;
          else if (d === today) dueToday++;
        });
      }
    });
    return { contacted, interested, partnered, dueToday, overdue, highFit, gasDealers, replied };
  }, [tracker]);

  const filtered = useMemo(() => {
    return OUTREACH_LEADS.filter((l) => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (fCategory && l.category !== fCategory) return false;
      if (fFit && l.fit !== fFit) return false;
      if (fCounty && l.county !== fCounty) return false;
      const r = getRow(l);
      if (fStatus && r.status !== fStatus) return false;
      if (fReply && r.reply !== fReply) return false;
      if (fDue) {
        if (fDue === "due" && !(r.f1 === today || r.f2 === today)) return false;
        if (fDue === "overdue" && !((r.f1 && r.f1 < today) || (r.f2 && r.f2 < today))) return false;
      }
      return true;
    });
  }, [search, fCategory, fFit, fCounty, fStatus, fReply, fDue, tracker]);

  const handleWhatsApp = (lead: OutreachLead) => {
    const link = waLink(lead, template);
    if (link) window.open(link, "_blank");
    const key = slug(lead.name);
    const r = getRow(lead);
    if (r.status === "Not Contacted") {
      persist({
        ...tracker,
        [key]: {
          ...r,
          status: "Contacted",
          first: todayStr(),
          f1: addDays(todayStr(), 4),
          f2: addDays(todayStr(), 10),
        },
      });
    }
  };

  const handleSendProposal = (lead: OutreachLead) => {
    const link = proposalWaLink(lead);
    if (link) window.open(link, "_blank");
  };

  const handleStatusChange = (lead: OutreachLead, status: LeadStatus) => {
    const key = slug(lead.name);
    const r = getRow(lead);
    const next: TrackerRow = { ...r, status };
    if (status === "Contacted" && !r.first) {
      next.first = todayStr();
      next.f1 = addDays(todayStr(), 4);
      next.f2 = addDays(todayStr(), 10);
    }
    persist({ ...tracker, [key]: next });
  };

  const handleReplyChange = (lead: OutreachLead, reply: ReplyStatus) => {
    const key = slug(lead.name);
    const r = getRow(lead);
    persist({ ...tracker, [key]: { ...r, reply } });
  };

  const handleNotesChange = (lead: OutreachLead, notes: string) => {
    const key = slug(lead.name);
    const r = getRow(lead);
    persist({ ...tracker, [key]: { ...r, notes } });
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Vendor Outreach</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Nairobi, Kiambu, Kajiado, Machakos &amp; Murang'a · click-to-send WhatsApp outreach with follow-up tracking
          </p>
        </div>
      </div>

      {/* Resources */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-10 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-indigo-200 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wide">Vendor Resources</p>
            <p className="text-[12px] text-indigo-100/80 mt-0.5">
              Share these with interested leads, or download for printing / in-person visits.
            </p>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2 mt-3">
          <a
            href={PROPOSAL_PDF_PATH}
            download
            className="flex items-center gap-1.5 bg-white text-indigo-700 text-[12px] font-semibold px-3 py-2 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <FileText className="w-4 h-4" /> Partnership Proposal
            <Download className="w-3.5 h-3.5 opacity-50" />
          </a>
          <a
            href={APPLICATION_FORM_PDF_PATH}
            download
            className="flex items-center gap-1.5 bg-white text-indigo-700 text-[12px] font-semibold px-3 py-2 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <FileText className="w-4 h-4" /> Vendor Application Form
            <Download className="w-3.5 h-3.5 opacity-50" />
          </a>
        </div>
        <p className="relative text-[11px] text-indigo-100/70 mt-2.5">
          The application form has fillable fields — vendors can type directly into it (Acrobat / Preview / most
          PDF apps) or print and fill by hand.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard icon={Users} label="Total Leads" value={OUTREACH_LEADS.length} />
        <StatCard icon={TrendingUp} label="Gas Dealers" value={stats.gasDealers} accent="text-orange-600" />
        <StatCard icon={Users} label="High Fit" value={stats.highFit} />
        <StatCard icon={MessageCircle} label="Contacted" value={stats.contacted} />
        <StatCard icon={Handshake} label="Interested" value={stats.interested} accent="text-emerald-600" />
        <StatCard icon={Reply} label="Replied" value={stats.replied} accent="text-sky-600" />
        <StatCard icon={Clock} label="Due Today" value={stats.dueToday} accent="text-amber-600" />
        <StatCard icon={AlertCircle} label="Overdue" value={stats.overdue} accent="text-rose-600" />
      </div>

      {/* Message template */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
          Message template
        </label>
        <textarea
          className="mt-2 w-full min-h-[64px] border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
          value={template}
          onChange={(e) => {
            setTemplate(e.target.value);
            try {
              localStorage.setItem(TEMPLATE_KEY, e.target.value);
            } catch {
              /* ignore */
            }
          }}
        />
        <p className="text-[11px] text-slate-400 mt-1.5">
          Use {"{business}"} to insert the business name. Edit your name/phone/WhatsApp before sending — each
          message still needs your tap to send, nothing is sent automatically.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="Search business name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={fCategory} onChange={setFCategory} placeholder="All categories">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={fFit} onChange={setFFit} placeholder="All fit levels">
          <option value="High">High fit</option>
          <option value="Medium-High">Medium-High fit</option>
          <option value="Medium">Medium fit</option>
          <option value="Low">Low fit</option>
        </Select>
        <Select value={fCounty} onChange={setFCounty} placeholder="All counties">
          <option value="Nairobi">Nairobi</option>
          <option value="Kajiado">Kajiado</option>
          <option value="Kiambu">Kiambu</option>
          <option value="Machakos">Machakos</option>
          <option value="Murang'a">Murang'a</option>
        </Select>
        <Select value={fStatus} onChange={setFStatus} placeholder="All statuses">
          <option value="Not Contacted">Not Contacted</option>
          <option value="Contacted">Contacted</option>
          <option value="Interested">Interested</option>
          <option value="Not Interested">Not Interested</option>
          <option value="Partnered">Partnered</option>
        </Select>
        <Select value={fReply} onChange={setFReply} placeholder="Any reply status">
          <option value="No Reply">No Reply</option>
          <option value="Replied - Positive">Replied - Positive</option>
          <option value="Replied - Negative">Replied - Negative</option>
          <option value="Replied - Needs Follow-up">Replied - Needs Follow-up</option>
        </Select>
        <Select value={fDue} onChange={setFDue} placeholder="Any follow-up state">
          <option value="due">Follow-up due today</option>
          <option value="overdue">Follow-up overdue</option>
        </Select>
      </div>

      <p className="text-[12px] text-slate-400">
        Showing {filtered.length} of {OUTREACH_LEADS.length} leads
      </p>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <Th>Business</Th>
                <Th>Category</Th>
                <Th>Fit</Th>
                <Th>Location</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th>Follow-up</Th>
                <Th>Reply</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const r = getRow(lead);
                const wa = waLink(lead, template);
                const tel = telLink(lead);
                let dueBadge: { text: string; overdue: boolean } | null = null;
                if (r.status === "Contacted") {
                  if (r.f1 && r.f1 < today) dueBadge = { text: "F1 overdue", overdue: true };
                  else if (r.f1 === today) dueBadge = { text: "F1 due", overdue: false };
                  else if (r.f2 && r.f2 < today) dueBadge = { text: "F2 overdue", overdue: true };
                  else if (r.f2 === today) dueBadge = { text: "F2 due", overdue: false };
                }
                return (
                  <tr key={lead.name + lead.location} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                      {lead.name}
                      {dueBadge && (
                        <span
                          className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            dueBadge.overdue ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {dueBadge.text}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block bg-orange-50 text-orange-700 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                        {lead.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        title={lead.fitNote}
                        className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${FIT_STYLES[lead.fit]}`}
                      >
                        {lead.fit}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{lead.location}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {wa && (
                          <button
                            onClick={() => handleWhatsApp(lead)}
                            className="flex items-center gap-1 bg-[#25D366] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </button>
                        )}
                        {tel && (
                          <a
                            href={tel}
                            className="flex items-center gap-1 bg-indigo-600 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        )}
                        {wa && (
                          <button
                            onClick={() => handleSendProposal(lead)}
                            title="Send the partnership proposal via WhatsApp"
                            className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-200 border border-slate-200"
                          >
                            <Send className="w-3.5 h-3.5" /> Proposal
                          </button>
                        )}
                        {!wa && !tel && <span className="text-[11px] text-slate-400">Visit in person</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        className={`text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white ${STATUS_STYLES[r.status]}`}
                        value={r.status}
                        onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                      >
                        <option>Not Contacted</option>
                        <option>Contacted</option>
                        <option>Interested</option>
                        <option>Not Interested</option>
                        <option>Partnered</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500 leading-relaxed whitespace-nowrap">
                      {r.first && <div>First: {r.first}</div>}
                      {r.f1 && <div>F1: {r.f1}</div>}
                      {r.f2 && <div>F2: {r.f2}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        className={`text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white ${REPLY_STYLES[r.reply]}`}
                        value={r.reply}
                        onChange={(e) => handleReplyChange(lead, e.target.value as ReplyStatus)}
                      >
                        <option>No Reply</option>
                        <option>Replied - Positive</option>
                        <option>Replied - Negative</option>
                        <option>Replied - Needs Follow-up</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        className="w-28 text-[12px] border border-slate-200 rounded-lg px-2 py-1"
                        placeholder="notes..."
                        defaultValue={r.notes}
                        onBlur={(e) => handleNotesChange(lead, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 pb-4">
        Data sourced from public business listings. WhatsApp/call/proposal actions open your own device's apps —
        nothing is sent automatically or in bulk. Status and dates are saved to this browser.
      </p>
    </div>
  );
}

// ======================================================
// Small helpers
// ======================================================

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "text-indigo-600",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`text-xl font-bold ${accent}`}>{value}</span>
        <Icon className={`w-4 h-4 ${accent} opacity-60`} />
      </div>
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">
      {children}
    </th>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}
