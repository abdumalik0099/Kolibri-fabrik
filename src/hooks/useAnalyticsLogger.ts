import { useEffect } from "react";
import { logVisit, upsertPresence } from "@/lib/analytics";

const SESSION_KEY = "kolibri_session_id";

function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getDeviceModel() {
  const ua = navigator.userAgent || "Unknown device";
  // Attempt to simplify userAgent
  const match = ua.match(/\(([^)]+)\)/);
  if (match?.[1]) {
    return match[1];
  }
  return ua;
}

function getRegionFromCoordinates(lat: number, lng: number) {
  const regionBoxes = [
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

  const match = regionBoxes.find(
    (box) => lat >= box.latMin && lat <= box.latMax && lng >= box.lngMin && lng <= box.lngMax,
  );
  return match?.key || "qashqadaryo";
}

async function getLocationLabel(): Promise<string> {
  if (!navigator.geolocation) return "qashqadaryo";

  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state === "denied") {
        return "qashqadaryo";
      }
    } catch {
      // Ignore permission query failures and fall back to normal geolocation.
    }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(getRegionFromCoordinates(position.coords.latitude, position.coords.longitude));
      },
      () => {
        resolve("qashqadaryo");
      },
      { timeout: 5000 },
    );
  });
}

export function useAnalyticsLogger() {
  useEffect(() => {
    const sessionId = getSessionId();
    let isActive = true;
    let currentLocation = "Unknown";
    let loggedEntry = false;

    const registerVisit = async () => {
      const deviceModel = getDeviceModel();
      const location = await getLocationLabel();
      currentLocation = location;
      if (!isActive) return;
      if (!loggedEntry) {
        await logVisit({ deviceModel, location, sessionId });
        loggedEntry = true;
      }
      await upsertPresence(sessionId, { deviceModel, location });
    };

    registerVisit();

    const heartbeat = setInterval(() => {
      upsertPresence(sessionId, {
        deviceModel: getDeviceModel(),
        location: currentLocation,
      });
    }, 10_000);

    const manualSignal = () => {
      if (!isActive) return;
      upsertPresence(sessionId, {
        deviceModel: getDeviceModel(),
        location: currentLocation,
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        manualSignal();
      }
    };

    window.addEventListener("focus", manualSignal);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      clearInterval(heartbeat);
      window.removeEventListener("focus", manualSignal);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
