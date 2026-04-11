import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSecret = () => {
  const navigate = useNavigate();
  
  // 5 marta bosish uchun ref'lar
  const clicks = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  // Silkitish uchun ref'lar
  const lastUpdate = useRef(0);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastZ = useRef(0);
  const threshold = 15; // Silkitish sezgirligi

  useEffect(() => {
    // --- 1-USUL: 5 MARTA TEZ-TEZ BOSISH ---
    const handleGesture = () => {
      clicks.current += 1;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      
      clickTimer.current = setTimeout(() => {
        clicks.current = 0;
      }, 2000);

      if (clicks.current >= 5) {
        navigate('/admin');
        clicks.current = 0;
      }
    };

    // --- 2-USUL: TELEFONNI SILKITISH ---
    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const currTime = Date.now();
      if (currTime - lastUpdate.current > 100) {
        const diffTime = currTime - lastUpdate.current;
        lastUpdate.current = currTime;

        const x = acceleration.x || 0;
        const y = acceleration.y || 0;
        const z = acceleration.z || 0;

        const speed = Math.abs(x + y + z - lastX.current - lastY.current - lastZ.current) / diffTime * 10000;

        if (speed > threshold) {
          navigate('/admin');
        }

        lastX.current = x;
        lastY.current = y;
        lastZ.current = z;
      }
    };

    // Ruxsatlarni tekshirish (iOS 13+ uchun)
    const initSensors = () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any).requestPermission()
          .then((state: string) => {
            if (state === 'granted') window.addEventListener('devicemotion', handleMotion);
          });
      } else {
        window.addEventListener('devicemotion', handleMotion);
      }
    };

    // Eventlarni qo'shish
    window.addEventListener('click', handleGesture);
    initSensors();

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('devicemotion', handleMotion);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, [navigate]);
};