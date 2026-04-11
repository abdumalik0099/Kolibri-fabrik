import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSecret = () => {
  const navigate = useNavigate();
  useEffect(() => {
    let t: any;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'VolumeDown') {
        e.preventDefault();
        if (!t) t = setTimeout(() => navigate('/admin'), 5000);
      }
    };
    const up = () => { clearTimeout(t); t = null; };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [navigate]);
};