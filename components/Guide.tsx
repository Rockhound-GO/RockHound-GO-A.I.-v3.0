
import React from 'react';
import { X, Camera, Zap, Box, BarChart2, Cpu, ChevronRight } from 'lucide-react';

interface GuideProps {
  onClose: () => void;
}

export const Guide: React.FC<GuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 font-mono">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="w-full max-w-lg max-h-[85vh] flex flex-col relative border border-cyan-500/30 rounded-2xl overflow-hidden bg-gray-900/80 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        {/* Decorative Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500" />

        <header className="flex items-center justify-between p-6 border-b border-white/10 flex-none bg-black/40">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-[0.2em] uppercase text-glow">System Manual</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/30 text-gray-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto no-scrollbar space-y-8 relative z-10">

          {/* Section 1: Scanning */}
          <div className="group relative pl-4 border-l-2 border-indigo-500/30 hover:border-indigo-500 transition-colors duration-300">
            <div className="absolute -left-[5px] top-0 w-2 h-2 bg-black border border-indigo-500 rounded-full group-hover:bg-indigo-500 transition-colors" />
            <div className="flex gap-4">
              <div className="bg-indigo-900/20 border border-indigo-500/30 text-indigo-400 rounded-xl w-12 h-12 flex-none flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    01. Acquisition
                    <ChevronRight className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Engage the <span className="text-indigo-400 font-bold">OPTICAL SENSOR</span> via the central command node. Align target within the HUD reticle for optimal biometric scanning. Ensure ambient lighting exceeds minimal thresholds.
                </p>
              </div>
            </div>
          </div>
          
          {/* Section 2: Identifying */}
          <div className="group relative pl-4 border-l-2 border-purple-500/30 hover:border-purple-500 transition-colors duration-300">
            <div className="absolute -left-[5px] top-0 w-2 h-2 bg-black border border-purple-500 rounded-full group-hover:bg-purple-500 transition-colors" />
            <div className="flex gap-4">
              <div className="bg-purple-900/20 border border-purple-500/30 text-purple-400 rounded-xl w-12 h-12 flex-none flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    02. Neural Analysis
                    <ChevronRight className="w-3 h-3 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Initiate <span className="text-purple-400 font-bold">AI PROTOCOLS</span> to decrypt specimen data. The system returns classification, molecular composition estimates, and rarity index calculations.
                </p>
              </div>
            </div>
          </div>
          
          {/* Section 3: Collection */}
          <div className="group relative pl-4 border-l-2 border-cyan-500/30 hover:border-cyan-500 transition-colors duration-300">
            <div className="absolute -left-[5px] top-0 w-2 h-2 bg-black border border-cyan-500 rounded-full group-hover:bg-cyan-500 transition-colors" />
            <div className="flex gap-4">
              <div className="bg-cyan-900/20 border border-cyan-500/30 text-cyan-400 rounded-xl w-12 h-12 flex-none flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    03. Archival
                    <ChevronRight className="w-3 h-3 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Secure valid specimens in the <span className="text-cyan-400 font-bold">DIGITAL VAULT</span>. Access holographic records anytime to review metadata and comparative models.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Stats */}
          <div className="group relative pl-4 border-l-2 border-emerald-500/30 hover:border-emerald-500 transition-colors duration-300">
            <div className="absolute -left-[5px] top-0 w-2 h-2 bg-black border border-emerald-500 rounded-full group-hover:bg-emerald-500 transition-colors" />
            <div className="flex gap-4">
              <div className="bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 rounded-xl w-12 h-12 flex-none flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    04. Performance
                    <ChevronRight className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Monitor operational efficiency via the <span className="text-emerald-400 font-bold">STATS DASHBOARD</span>. Track classification ratios, rarity distribution curves, and total experience yield.
                </p>
              </div>
            </div>
          </div>
          
        </div>
        
        <footer className="p-6 flex-none mt-auto border-t border-white/5 bg-black/40">
            <button onClick={onClose} className="w-full py-4 bg-cyan-900/20 border border-cyan-500/50 text-cyan-400 font-bold text-xs rounded-xl hover:bg-cyan-500 hover:text-black transition-all uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                Acknowledge Protocol
            </button>
        </footer>
      </div>
    </div>
  );
};
