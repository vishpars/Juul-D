import React, { useEffect, useState } from 'react';

const BG_OFF = "https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/home_bg_dimm.jpg";
const BG_ON = "https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/home_bg_lit.jpg";

export const BackgroundAmbience: React.FC = () => {
  const [litOpacity, setLitOpacity] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleAnimation = () => {
      // 1. Wait random time (40-60s)
      const waitTime = Math.floor(Math.random() * (60000 - 40000 + 1) + 40000);
      
      console.log(`[Ambience] Waiting ${waitTime/1000}s before lighting up.`);

      timeoutId = setTimeout(() => {
        // 2. Fade In (handled by CSS transition)
        setLitOpacity(1);
        
        // 3. Hold for random time (40-60s)
        const activeTime = Math.floor(Math.random() * (60000 - 40000 + 1) + 40000);
        console.log(`[Ambience] Runes lit for ${activeTime/1000}s.`);

        timeoutId = setTimeout(() => {
          // 4. Fade Out
          setLitOpacity(0);
          
          // 5. Schedule next cycle after fade out matches transition time (2s)
          timeoutId = setTimeout(scheduleAnimation, 2000);
        }, activeTime);

      }, waitTime);
    };

    // Initial delay before first cycle
    timeoutId = setTimeout(scheduleAnimation, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-slate-950">
      {/* Layer 1: Base (Dimmed/Off) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] ease-in-out hover:scale-105"
        style={{ backgroundImage: `url(${BG_OFF})` }}
      />

      {/* Layer 2: Active (Lit/On) Container with 3px Shift */}
      <div 
        className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out translate-x-[3px]"
        style={{ opacity: litOpacity }}
      >
         {/* Inner Layer: Handles the flickering (breathing) effect while active */}
         <div 
           className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-pulse-slow"
           style={{ backgroundImage: `url(${BG_ON})` }}
         />
      </div>
      
      {/* Overlay Gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
    </div>
  );
};