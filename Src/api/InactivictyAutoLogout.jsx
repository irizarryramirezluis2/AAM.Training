// Src/Components/InactivityAutoLogout.jsx
import React, { useEffect, useRef } from 'react';

export default function InactivityAutoLogout({ 
  onLogout, 
  timeoutMinutes = 15, 
  children 
}) {
  const timerRef = useRef(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      console.warn(`[SECURITY] User idle for ${timeoutMinutes} minutes. Triggering auto-logout.`);
      if (onLogout) onLogout();
    }, timeoutMs);
  };

  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleUserActivity = () => resetTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    resetTimer(); // Initialize timer on mount

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [timeoutMinutes]);

  return <>{children}</>;
}