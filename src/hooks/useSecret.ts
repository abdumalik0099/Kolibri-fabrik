import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSecret = () => {
  const navigate = useNavigate();
  const inputSequence = useRef(''); // Bosilgan harflarni saqlash uchun
  const clicks = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. KOMPYUTER UCHUN: "admin" so'zini terish
    const handleKeyDown = (e: KeyboardEvent) => {
      // Faqat harf va raqamlarni qabul qilamiz
      if (e.key.length === 1) {
        inputSequence.current += e.key.toLowerCase();

        // Faqat oxirgi 5 ta harfni saqlaymiz (chunki "admin" 5 ta harf)
        inputSequence.current = inputSequence.current.slice(-5);

        // Agar oxirgi yozilgan so'z "admin" bo'lsa
        if (inputSequence.current === '0000') {
          inputSequence.current = ''; // Tozalash
          navigate('/admin');
        }
      }
    };

    // 2. MOBIL UCHUN: 5 marta bosish (zaxira varianti)
    const handleGesture = () => {
      clicks.current += 1;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => { clicks.current = 0; }, 2000);

      if (clicks.current >= 5) {
        navigate('/admin');
        clicks.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleGesture);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleGesture);
    };
  }, [navigate]);
};