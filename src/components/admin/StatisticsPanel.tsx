import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

type AnalyticsDoc = {
  id: string;
  deviceModel: string;
  location: string;
  entryTime?: Timestamp;
};

type PresenceDoc = {
  id: string;
  deviceModel: string;
  location: string;
  entryTime?: Timestamp;
  lastActive?: Timestamp;
};

const ONLINE_THRESHOLD_MS = 90_000;

function formatTime(ts?: Timestamp) {
  if (!ts) return "-";
  return format(ts.toDate(), "HH:mm:ss");
}

function formatDuration(ms?: number) {
  if (!ms) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function StatisticsPanel() {
  const [analytics, setAnalytics] = useState<AnalyticsDoc[]>([]);
  const [presence, setPresence] = useState<PresenceDoc[]>([]);

  useEffect(() => {
    const q = query(collection(db, "analytics"), orderBy("entryTime", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setAnalytics(
        snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as AnalyticsDoc) })),
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "presence"), (snapshot) => {
      setPresence(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as PresenceDoc),
        })),
      );
    });
    return unsub;
  }, []);

  const lineData = useMemo(() => {
    const buckets = new Map<string, number>();
    analytics.forEach((entry) => {
      const entryTime = entry.entryTime?.toDate();
      if (!entryTime) return;
      const label = format(entryTime, "HH:mm");
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });
    return Array.from(buckets.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (a.name > b.name ? 1 : -1));
  }, [analytics]);

  const deviceData = useMemo(() => {
    const counts = new Map<string, number>();
    analytics.forEach((entry) => {
      const label = entry.deviceModel || "Unknown";
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([deviceModel, count]) => ({ deviceModel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [analytics]);

  const onlineUsers = useMemo(() => {
    const threshold = Date.now() - ONLINE_THRESHOLD_MS;
    return presence
      .filter((entry) => (entry.lastActive?.toMillis() ?? 0) >= threshold)
      .map((entry) => {
        const entryMs = entry.entryTime?.toMillis() ?? 0;
        const lastMs = entry.lastActive?.toMillis() ?? 0;
        return {
          ...entry,
          durationMs: Math.max(0, lastMs - entryMs),
          lastActiveMs: lastMs,
        };
      })
      .sort((a, b) => (b.lastActiveMs ?? 0) - (a.lastActiveMs ?? 0));
  }, [presence]);

  return (
    <div className="rounded-2xl border border-border/60 bg-charcoal-light/30 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-cream">Real-time Statistika</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-charcoal/40 p-4 rounded-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Kirganlar trendi</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid opacity={0.3} />
                <XAxis dataKey="name" tick={{ fill: "#e2e8f0" }} />
                <YAxis tick={{ fill: "#e2e8f0" }} />
                <Tooltip contentStyle={{ backgroundColor: "#111827" }} />
                <Area dataKey="count" stroke="#fbbf24" strokeWidth={2} fill="url(#visitGradient)" activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-charcoal/40 p-4 rounded-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Device turlari</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceData}>
                <defs>
                  <linearGradient id="deviceGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f5c32a" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <CartesianGrid opacity={0.3} />
                <XAxis dataKey="deviceModel" tick={{ fill: "#e2e8f0" }} interval={0} />
                <YAxis tick={{ fill: "#e2e8f0" }} />
                <Tooltip contentStyle={{ backgroundColor: "#111827" }} />
                <Bar dataKey="count" fill="url(#deviceGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-charcoal/40 p-4 rounded-2xl space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Hozir onlayn</p>
        {onlineUsers.length === 0 ? (
          <p className="text-xs text-cream/70">Hozir hech kim onlayn emas.</p>
        ) : (
          onlineUsers.map((user) => (
            <div key={user.id} className="flex flex-col gap-1 rounded-xl border border-border/50 bg-charcoal/60 p-3">
              <div className="flex items-center justify-between text-sm text-cream">
                <span>{user.deviceModel}</span>
                <span>{formatTime(user.lastActive)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{user.location}</p>
              <p className="text-xs text-muted-foreground">
                Saytda qancha vaqt: {formatDuration(user.durationMs)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
