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
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "@/lib/firebase";
import { resetStatistics } from "@/lib/analytics";
import { differenceInDays, format, startOfDay, subDays } from "date-fns";

type AnalyticsDoc = {
  id: string;
  deviceModel: string;
  location: string;
  sessionId?: string;
  entryTime?: Timestamp;
};

type PresenceDoc = {
  id: string;
  deviceModel: string;
  location: string;
  sessionId?: string;
  entryTime?: Timestamp;
  lastActive?: Timestamp;
};

const ONLINE_THRESHOLD_MS = 90_000;

const RANGE_OPTIONS = [
  { label: "1 kun", value: "day" as const },
  { label: "1 hafta", value: "week" as const },
  { label: "1 oy", value: "month" as const },
  { label: "All Time", value: "all" as const },
];

const UZ_REGIONS = [
  { name: "Toshkent Shahri", key: "toshkent shahri", coords: { top: "24%", left: "60%" } },
  { name: "Toshkent Viloyati", key: "toshkent viloyati", coords: { top: "29%", left: "53%" } },
  { name: "Samarqand Viloyati", key: "samarqand", coords: { top: "44%", left: "45%" } },
  { name: "Qashqadaryo Viloyati", key: "qashqadaryo", coords: { top: "57%", left: "42%" } },
  { name: "Buxoro Viloyati", key: "buxoro", coords: { top: "58%", left: "29%" } },
  { name: "Fargʻona Viloyati", key: "fargʻona", coords: { top: "38%", left: "66%" } },
  { name: "Andijon Viloyati", key: "andijon", coords: { top: "34%", left: "71%" } },
  { name: "Namangan Viloyati", key: "namangan", coords: { top: "28%", left: "71%" } },
  { name: "Navoiy Viloyati", key: "navoiy", coords: { top: "43%", left: "26%" } },
  { name: "Jizzax Viloyati", key: "jizzax", coords: { top: "40%", left: "38%" } },
  { name: "Sirdaryo Viloyati", key: "sirdaryo", coords: { top: "34%", left: "49%" } },
  { name: "Qoraqalpogʻiston Respublikasi", key: "qoraqalpogʻiston", coords: { top: "56%", left: "12%" } },
  { name: "Xorazm Viloyati", key: "xorazm", coords: { top: "59%", left: "18%" } },
  { name: "Surxondaryo Viloyati", key: "surxondaryo", coords: { top: "67%", left: "44%" } },
];

export default function StatisticsPanel() {
  const [analytics, setAnalytics] = useState<AnalyticsDoc[]>([]);
  const [presence, setPresence] = useState<PresenceDoc[]>([]);
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]["value"]>("week");
  const [isResetting, setIsResetting] = useState(false);

  const handleResetStatistics = async () => {
    if (!window.confirm("Statistikani 0 ga qaytarmoqchimisiz?")) {
      return;
    }
    setIsResetting(true);
    try {
      await resetStatistics();
    } catch (error) {
      console.error("Statistikani reset qilishda xatolik:", error);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "analytics"), orderBy("entryTime", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setAnalytics(
        snapshot.docs.map((doc) => {
          const { id: _id, ...rest } = doc.data() as AnalyticsDoc;
          return { ...rest, id: doc.id };
        }),
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "presence"), (snapshot) => {
      setPresence(
        snapshot.docs.map((doc) => {
          const { id: _id, ...rest } = doc.data() as PresenceDoc;
          return { ...rest, id: doc.id };
        }),
      );
    });
    return unsub;
  }, []);

  const totalVisits = analytics.length;
  const uniqueDevices = useMemo(() => {
    const unique = new Set(analytics.map((entry) => entry.sessionId || entry.deviceModel));
    return unique.size;
  }, [analytics]);

  const lineData = useMemo(() => {
    const end = new Date();
    const daysToShow = (() => {
      switch (range) {
        case "day":
          return 1;
        case "week":
          return 7;
        case "month":
          return 30;
        case "all": {
          if (!analytics.length) return 30;
          const earliest = analytics.reduce((acc, entry) => {
            const time = entry.entryTime?.toDate();
            if (!time) return acc;
            if (!acc || time < acc) return time;
            return acc;
          }, null as Date | null);
          if (!earliest) return 30;
          const diff = differenceInDays(end, startOfDay(earliest));
          return Math.min(Math.max(diff + 1, 7), 180);
        }
      }
    })();
    const labelFormat = range === "day" ? "HH:mm" : "MMM d";
    const rangeStart = subDays(end, daysToShow - 1);

    const labels = Array.from({ length: daysToShow }, (_, index) => {
      const day = subDays(startOfDay(end), daysToShow - 1 - index);
      return format(day, labelFormat);
    });

    const counts = new Map(labels.map((label) => [label, 0]));
    analytics.forEach((entry) => {
      const entryTime = entry.entryTime?.toDate();
      if (!entryTime || entryTime < rangeStart || entryTime > end) return;
      const label = format(entryTime, labelFormat);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    return labels.map((name) => ({ name, count: counts.get(name) ?? 0 }));
  }, [analytics, range]);

  const displayedLineData = useMemo(() => {
    if (lineData.length > 0) return lineData;
    const labelFormat = range === "day" ? "HH:mm" : "MMM d";
    const end = startOfDay(new Date());
    const daysToShow = range === "day" ? 1 : range === "week" ? 7 : range === "month" ? 30 : 30;
    return Array.from({ length: daysToShow }, (_, index) => {
      const day = subDays(end, daysToShow - 1 - index);
      return { name: format(day, labelFormat), count: 0 };
    });
  }, [lineData, range]);

  const onlineUsers = useMemo(() => {
    const threshold = Date.now() - ONLINE_THRESHOLD_MS;
    const latestPerDevice = new Map<string, PresenceDoc & { lastActiveMs: number; durationMs: number }>();

    presence.forEach((entry) => {
      const lastMs = entry.lastActive?.toMillis() ?? 0;
      if (lastMs < threshold) return;
      const entryMs = entry.entryTime?.toMillis() ?? 0;
      const durationMs = Math.max(0, lastMs - entryMs);

      const key = entry.deviceModel || entry.id;
      const existing = latestPerDevice.get(key);
      if (!existing || lastMs > existing.lastActiveMs) {
        latestPerDevice.set(key, {
          ...entry,
          lastActiveMs: lastMs,
          durationMs,
        });
      }
    });

    return Array.from(latestPerDevice.values()).sort((a, b) => b.lastActiveMs - a.lastActiveMs);
  }, [presence]);

  function getRegionKeyFromLocation(location: string): string | null {
    const lower = location.toLowerCase();

    if (lower.includes("/")) {
      return "qashqadaryo";
    }

    if (lower.includes("qarshi") || lower.includes("qashqadaryo")) {
      return "qashqadaryo";
    }

    const containsKey = UZ_REGIONS.find((region) => lower.includes(region.key));
    if (containsKey) {
      return containsKey.key;
    }

    const coordMatch = location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (!coordMatch) {
      return null;
    }

    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);

    const regionBoxes: Array<{
      key: string;
      latMin: number;
      latMax: number;
      lngMin: number;
      lngMax: number;
    }> = [
      { key: "toshkent shahri", latMin: 41.0, latMax: 41.5, lngMin: 69.2, lngMax: 69.5 },
      { key: "toshkent viloyati", latMin: 40.0, latMax: 41.7, lngMin: 68.5, lngMax: 71.7 },
      { key: "samarqand", latMin: 39.0, latMax: 40.5, lngMin: 66.5, lngMax: 69.0 },
      { key: "qashqadaryo", latMin: 37.0, latMax: 39.5, lngMin: 64.0, lngMax: 67.5 },
      { key: "buxoro", latMin: 39.0, latMax: 41.5, lngMin: 60.5, lngMax: 64.5 },
      { key: "fargʻona", latMin: 40.5, latMax: 41.8, lngMin: 69.0, lngMax: 71.5 },
      { key: "andijon", latMin: 40.5, latMax: 41.7, lngMin: 71.0, lngMax: 73.0 },
      { key: "namangan", latMin: 40.5, latMax: 41.7, lngMin: 71.5, lngMax: 73.5 },
      { key: "navoiy", latMin: 39.0, latMax: 41.0, lngMin: 63.5, lngMax: 66.5 },
      { key: "jizzax", latMin: 39.0, latMax: 40.5, lngMin: 67.0, lngMax: 69.5 },
      { key: "sirdaryo", latMin: 40.0, latMax: 41.7, lngMin: 65.5, lngMax: 67.5 },
      { key: "qoraqalpogʻiston", latMin: 40.0, latMax: 43.0, lngMin: 56.0, lngMax: 62.0 },
      { key: "xorazm", latMin: 40.0, latMax: 42.5, lngMin: 57.0, lngMax: 61.0 },
      { key: "surxondaryo", latMin: 37.0, latMax: 38.5, lngMin: 66.5, lngMax: 68.5 },
    ];

    const matchBox = regionBoxes.find(
      (box) => lat >= box.latMin && lat <= box.latMax && lng >= box.lngMin && lng <= box.lngMax,
    );
    return matchBox ? matchBox.key : null;
  }

  const regionData = useMemo(() => {
    const counts = new Map(UZ_REGIONS.map((region) => [region.key, 0]));
    analytics.forEach((entry) => {
      const location = entry.location || "";
      const key = getRegionKeyFromLocation(location);
      if (key) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });
    return UZ_REGIONS.map((region) => ({
      ...region,
      count: counts.get(region.key) ?? 0,
    }));
  }, [analytics]);

  const regionList = useMemo(() => {
    const sorted = [...regionData].sort((a, b) => b.count - a.count);
    return sorted.slice(0, 13);
  }, [regionData]);

  const maxRegionCount = Math.max(1, ...regionList.map((region) => region.count));

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-border/60 bg-charcoal-light/30 p-4 sm:p-6 space-y-6">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max flex-nowrap items-center gap-3 whitespace-nowrap">
          <h2 className="text-lg font-semibold text-cream text-center md:text-left">Real-time Statistika</h2>
          <button
            type="button"
            onClick={handleResetStatistics}
            disabled={isResetting}
            className="inline-flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs uppercase tracking-[0.4em] text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResetting ? "Resetlanmoqda..." : "Statistikani reset qilish"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="bg-charcoal/50 p-5 rounded-2xl border border-border/40">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Umumiy kirishlar</p>
          <p className="text-4xl font-semibold text-gold mt-3">{totalVisits}</p>
          <p className="text-xs text-cream/60 mt-1">Saytga jami kirishlar</p>
        </div>
        <div className="bg-charcoal/50 p-5 rounded-2xl border border-border/40">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Takrorlanmas kirishlar</p>
          <p className="text-4xl font-semibold text-gold mt-3">{uniqueDevices}</p>
          <p className="text-xs text-cream/60 mt-1">Har bir telefon faqat 1 marta hisoblanadi</p>
        </div>
        <div className="bg-charcoal/50 p-5 rounded-2xl border border-border/40">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Hozir onlayn</p>
          <p className="text-4xl font-semibold text-gold mt-3">{onlineUsers.length}</p>
          <p className="text-xs text-cream/60 mt-1">{onlineUsers.length > 0 ? "Faol foydalanuvchilar" : "Hech kim yo‘q"}</p>
        </div>
      </div>

      <div className="bg-charcoal/40 p-4 rounded-2xl flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Kirganlar trendi</p>
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className={`px-3 py-1 text-[11px] uppercase tracking-[0.3em] rounded-full border border-border transition ${
                  range === option.value
                    ? "bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] text-[#0f0f0f] border-transparent"
                    : "text-cream/60 hover:text-cream"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-56 w-full rounded-3xl overflow-hidden bg-[#07121f] shadow-[0_24px_90px_rgba(0,0,0,0.35)] sm:h-64 border border-white/5">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#07121f] via-[#08141f] to-[#0a121d]" />
          <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-cream/70 backdrop-blur-sm">
            Total Growth
          </div>
          <div className="relative z-10 h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedLineData} margin={{ top: 36, right: 18, left: 18, bottom: 14 }}>
                <defs>
                  <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#0f172a" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="visitLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#5eead4" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" vertical={false} horizontal={true} strokeDasharray="4 8" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} padding={{ left: 12, right: 12 }} />
                <YAxis
                  tick={{ fill: "#cbd5e1", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                  domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                />
                <ReferenceLine y={0} stroke="#22d3ee" strokeWidth={2} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                  }}
                  labelFormatter={(label) => label}
                  formatter={(value: number) => [String(value), "Kirishlar"]}
                  cursor={{ stroke: "#22d3ee", strokeWidth: 2, opacity: 0.65 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="url(#visitLine)"
                  strokeWidth={4}
                  fill="url(#visitGradient)"
                  fillOpacity={1}
                  activeDot={{ r: 6, stroke: "#22d3ee", strokeWidth: 2, fill: "#0b1120" }}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 min-w-0">
        <div className="rounded-2xl border border-border/60 bg-charcoal/70 p-6 min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Aktiv foydalanuvchilar</p>
              <p className="text-lg font-semibold text-cream">Viloyatlar bo'yicha</p>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-cream/50">Hoziroq</span>
          </div>
          <div className="mt-6 space-y-4 min-w-0">
            {regionList.map((region) => {
              const width = maxRegionCount > 0 ? Math.round((region.count / maxRegionCount) * 100) : 0;
              return (
                <div key={region.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-cream">
                    <span>{region.name}</span>
                    <span className="text-xs text-cream/60">{region.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-charcoal/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
