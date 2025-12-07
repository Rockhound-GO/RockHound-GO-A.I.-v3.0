

import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // Timeout to ensure splash screen eventually finishes, even if video stalls
    const timeout = setTimeout(() => {
      setOpacity(0);
      setTimeout(onFinish, 500); // Wait for fade out
    }, 5000); // Max 5 seconds for splash screen

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onFinish]);

  const handleVideoEnded = () => {
    // Only trigger if progress is already at 100% or very close
    if (progress >= 98) {
      setOpacity(0);
      setTimeout(onFinish, 500);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030712] transition-opacity duration-500`}
      style={{ opacity }}
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnded}
        className={`absolute inset-0 w-full h-full object-cover`}
        // IMPORTANT: Replace this with your actual animated "Rockhound GO" logo video URL.
        // Example: If you have an MP4 file of the dog mining animation
        src="https://videos.pexels.com/video-files/5657375/5657375-hd_1920_1080_25fps.mp4" 
        poster="https://cdn-icons-png.flaticon.com/512/7543/7543166.png" // Fallback image
      >
        Your browser does not support the video tag.
      </video>
      {/* Dark overlay to ensure text readability */}
      <div className={`absolute inset-0 bg-black/50`} /> 
      
      {/* Main Logo Container */}
      <div className={`relative z-10 flex flex-col items-center`}>
        <div className={`relative w-48 h-48 mb-8`}>
          {/* Pulsing ring behind logo - now more subtle as video has its own animation */}
          <div className={`absolute inset-0 bg-indigo-500/20 rounded-full animate-pulse opacity-20`} />
          
          {/* Logo - The video itself serves as the main animation, this is a static representation */}
          <img 
            src="https://cdn-icons-png.flaticon.com/512/7543/7543166.png" 
            alt="RockHound GO Logo" 
            className={`w-full h-full object-contain drop-shadow-2xl opacity-80`}
          />
        </div>

        <h1 className={`text-4xl font-bold text-white mb-2 tracking-wider`}>
          ROCKHOUND<span className={`text-indigo-500`}>-GO</span>
        </h1>
        <p className={`text-gray-400 text-sm mb-12 tracking-widest uppercase`}>Geological Adventure Awaits</p>

        {/* Loading Bar */}
        <div className={`w-64 h-2 bg-gray-800 rounded-full overflow-hidden relative`}>
          <div 
            className={`absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-75 ease-out rounded-full`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`text-gray-500 text-xs mt-3 font-mono`}>LOADING... {progress}%</p>
      </div>
    </div>
  );
};