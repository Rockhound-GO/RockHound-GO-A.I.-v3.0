import React from 'react';
import { X, Camera, Zap, Box, BarChart2 } from 'lucide-react';

interface GuideProps {
  onClose: () => void;
}

export const Guide: React.FC<GuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-none">
          <h2 className="text-lg font-bold text-white">App Guide</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
          {/* Section 1: Scanning */}
          <div className="flex gap-4">
            <div className="bg-indigo-500/20 text-indigo-400 rounded-lg w-10 h-10 flex-none flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">1. Scan a Rock</h3>
              <p className="text-sm text-gray-400 mt-1">
                Use the center <span className="font-bold text-gray-300">Camera</span> button to open the scanner. Point your camera at a rock in good lighting, or upload a photo from your library.
              </p>
            </div>
          </div>
          
          {/* Section 2: Identifying */}
          <div className="flex gap-4">
            <div className="bg-purple-500/20 text-purple-400 rounded-lg w-10 h-10 flex-none flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">2. Identify with AI</h3>
              <p className="text-sm text-gray-400 mt-1">
                After capturing a photo, tap <span className="font-bold text-gray-300">Identify</span>. Our AI geologist will analyze the image and provide a detailed breakdown, including its name, type, rarity, and a fun fact.
              </p>
            </div>
          </div>
          
          {/* Section 3: Collection */}
          <div className="flex gap-4">
            <div className="bg-green-500/20 text-green-400 rounded-lg w-10 h-10 flex-none flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">3. Build Your Collection</h3>
              <p className="text-sm text-gray-400 mt-1">
                Save identified specimens to your personal collection. View all your finds in the <span className="font-bold text-gray-300">Collection</span> tab. You can search, filter by type, and tap on any rock to see its details again.
              </p>
            </div>
          </div>

          {/* Section 4: Stats */}
          <div className="flex gap-4">
            <div className="bg-orange-500/20 text-orange-400 rounded-lg w-10 h-10 flex-none flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">4. Track Your Stats</h3>
              <p className="text-sm text-gray-400 mt-1">
                Visit the <span className="font-bold text-gray-300">Stats</span> tab to see a dashboard of your progress, including a breakdown of rock types, rarity distribution, and your rarest find.
              </p>
            </div>
          </div>
          
        </div>
        
        <footer className="p-4 flex-none mt-auto">
            <button onClick={onClose} className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                Got it!
            </button>
        </footer>
      </div>
    </div>
  );
};