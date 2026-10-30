import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, type Socket } from 'socket.io-client';
import {
  fetchMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  socketUrl,
  type AdminNotification,
} from '../services/adminFeedService';

/** Broadcast so open pages (e.g. the overview) can refetch their numbers. */
export const DASHBOARD_REFRESH_EVENT = 'aquagas:dashboard-refresh';

const POLL_MS = 30_000; // safety net in case the live connection is down

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

// A short two-tone chime; silently does nothing if the browser blocks audio.
function chime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.start(t);
      o.stop(t + 0.16);
    });
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    /* audio blocked */
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const feed = await fetchMyNotifications(20);
      if (!mounted.current) return;
      setItems(feed.data);
      setUnread(feed.unread_count);
    } catch {
      /* keep what we have; the next poll retries */
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const poll = setInterval(load, POLL_MS);

    // Live updates: instant alert + dashboard refresh when an order comes in.
    let socket: Socket | null = null;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        socket = io(socketUrl(), { auth: { token }, transports: ['websocket', 'polling'], reconnectionDelayMax: 15000 });
        socket.on('adminNotification', (n: { title?: string; message?: string }) => {
          chime();
          toast.success(`${n.title ?? 'New order'}${n.message ? ` — ${n.message}` : ''}`, { icon: '🛒', duration: 7000 });
          load();
        });
        socket.on('dashboardUpdated', () => {
          window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT));
        });
        // Reconnecting after a drop: catch up on anything missed meanwhile.
        socket.on('connect', load);
      }
    } catch {
      /* polling still works */
    }

    return () => {
      mounted.current = false;
      clearInterval(poll);
      socket?.disconnect();
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openItem = async (n: AdminNotification) => {
    setOpen(false);
    if (!n.is_read) {
      setItems((cur) => cur.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      markMyNotificationRead(n.notification_id).catch(() => {});
    }
    if (n.related_entity_type === 'order') navigate('/orders');
  };

  const readAll = async () => {
    setItems((cur) => cur.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    markAllMyNotificationsRead().catch(load);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        className="relative p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all"
      >
        <Bell className="w-4 h-4 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[92vw] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-800">Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                No notifications yet. New orders will show up here.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.notification_id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${n.is_read ? '' : 'bg-emerald-50/50'}`}
                >
                  <span className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{n.title}</span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    </span>
                    <span className="block text-xs text-slate-500 line-clamp-2">{n.message}</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => { setOpen(false); navigate('/notifications'); }}
            className="w-full px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-t border-slate-100"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
