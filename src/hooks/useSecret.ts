import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSecret = () => {
  const navigate = useNavigate();
  const lastHeight = useRef(window.innerHeight);
  const clickCount = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      
      // Agar ekran balandligi o'zgarsa (ovoz paneli chiqqan bo'lishi mumkin)
      if (currentHeight !== lastHeight.current) {
        clickCount.current += 1;
        lastHeight.current = currentHeight;

        // Birinchi marta bosilganda taymerni ishga tushiramiz
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            // Agar 5 soniya ichida o'zgarishlar soni yetarli bo'lsa
            if (clickCount.current >= 3) { 
              navigate('/admin');
            }
            clickCount.current = 0;
            timerRef.current = null;
          }, 5000);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Eski usulni ham qo'shimcha sifatida qoldiramiz (ba'zi modellarda ishlaydi)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'VolumeDown' || e.key === 'volumedown') {
        // preventDefault ishlamasligi mumkin, lekin navigate-ni harakatga keltiramiz
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => navigate('/admin'), 5000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);
};