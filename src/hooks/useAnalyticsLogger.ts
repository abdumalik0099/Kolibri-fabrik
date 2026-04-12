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

async function getLocationLabel(): Promise<string> {
  if (!navigator.geolocation) return "Unknown";
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(`${position.coords.latitude.toFixed(3)},${position.coords.longitude.toFixed(3)}`);
      },
      () => {
        resolve(Intl.DateTimeFormat().resolvedOptions().timeZone);
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

    const registerVisit = async () => {
      const deviceModel = getDeviceModel();
      const location = await getLocationLabel();
      currentLocation = location;
      if (!isActive) return;
      await logVisit({ deviceModel, location, sessionId });
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
      registerVisit();
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
