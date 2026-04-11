import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSecret = () => {
  const navigate = useNavigate();
  
  // 5 marta bosish uchun
  const clicks = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  // Silkitish uchun
  const shakeCount = useRef(0);
  const shakeTimer = useRef<NodeJS.Timeout | null>(null);
  const lastUpdate = useRef(0);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastZ = useRef(0);
  
  // Sezgirlikni 15 dan 30 ga ko'tardik (shunda shunchaki ko'targanda ochilmaydi)
  const THRESHOLD = 30; 

  useEffect(() => {
    // 1-USUL: 5 MARTA BOSISH
    const handleGesture = () => {
      clicks.current += 1;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => { clicks.current = 0; }, 2000);

      if (clicks.current >= 5) {
        navigate('/admin');
        clicks.current = 0;
      }
    };

    // 2-USUL: FAQAT QATTIQ SILKITISH
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

        // Agar silkitish kuchi yetarli bo'lsa
        if (speed > THRESHOLD) {
          shakeCount.current += 1;
          
          if (shakeTimer.current) clearTimeout(shakeTimer.current);
          shakeTimer.current = setTimeout(() => { shakeCount.current = 0; }, 1000);

          // Ketma-ket 2 marta qattiq silkitilsa keyin ochiladi
          if (shakeCount.current >= 2) {
            navigate('/admin');
            shakeCount.current = 0;
          }
        }

        lastX.current = x;
        lastY.current = y;
        lastZ.current = z;
      }
    };

    window.addEventListener('click', handleGesture);
    
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission().then((s: string) => {
        if (s === 'granted') window.addEventListener('devicemotion', handleMotion);
      });
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [navigate]);
};