import React, { useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [opacity, setOpacity] = useState(1);

  const handleFinish = () => {
    setOpacity(0);
    // Wait for the fade-out transition before unmounting
    setTimeout(onFinish, 500);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030508] transition-opacity duration-500 ease-in-out"
      style={{ opacity }}
      onClick={handleFinish} // Allow user to tap to skip/enter immediately
    >
      <video
        autoPlay
        muted
        playsInline
        src="/video/rockhound-loading.mp4"
        onEnded={handleFinish}
        onError={(e) => {
            console.warn("Splash video failed to load, skipping.", e);
            handleFinish();
        }}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
};
