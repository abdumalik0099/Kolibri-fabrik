import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSecret = () => {
  const navigate = useNavigate();
  const clicks = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleGesture = () => {
      clicks.current += 1;

      // Har safar bosilganda taymerni yangilaymiz
      if (timerRef.current) clearTimeout(timerRef.current);

      // Agar 2 soniya ichida qayta bosilmasa, hisobni nolga tushiramiz
      timerRef.current = setTimeout(() => {
        clicks.current = 0;
      }, 2000);

      // Agar 5 marta tez-tez bosilsa
      if (clicks.current >= 5) {
        navigate('/admin');
        clicks.current = 0;
      }
    };

    // Butun ekran bo'ylab bosishni eshitish
    window.addEventListener('click', handleGesture);

    return () => {
      window.removeEventListener('click', handleGesture);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigate]);
};