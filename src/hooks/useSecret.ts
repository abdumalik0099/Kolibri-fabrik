import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSecret = () => {
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ba'zi telefonlarda 'VolumeDown', ba'zilarida 'volumedown'
      if (e.key.toLowerCase() === 'volumedown') {
        // Brauzerning ovoz panelini chiqarishini to'xtatishga urinish
        e.preventDefault();
        e.stopPropagation();

        if (!timerRef.current) {
          console.log("Ovoz tugmasi bosildi, 5 soniya kutilmoqda...");
          timerRef.current = setTimeout(() => {
            navigate('/admin');
            timerRef.current = null;
          }, 5000);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'volumedown') {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
          console.log("Tugma vaqtidan oldin qo'yib yuborildi.");
        }
      }
    };

    // 'capture: true' brauzer o'z funksiyasini bajarishidan oldin bizning kodni ishlatadi
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    document.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [navigate]);
};