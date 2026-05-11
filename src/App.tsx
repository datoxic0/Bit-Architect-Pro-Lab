/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  RefreshCw, 
  Table, 
  BarChart3, 
  Cpu, 
  BookOpen, 
  ChevronRight, 
  Binary,
  Info,
  Layers,
  ArrowRightLeft,
  Microchip,
  ShieldCheck,
  Eye,
  Zap,
  Activity,
  Server,
  Hash,
  Search,
  Maximize2,
  Signal,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  addBinary, 
  subBinary, 
  multiplyBinary,
  divideBinary,
  andBinary,
  orBinary,
  xorBinary,
  nandBinary,
  norBinary,
  xnorBinary,
  synthesizeLogic, 
  pad, 
  decToBin,
  LogicSolver,
  floatToIEEE754,
  decToGray,
  grayToDec,
  decToBCD,
  decToExcess3,
  encodeHamming74,
  getSignedInfo,
  generateReferenceData
} from './utils/binary.ts';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const CircuitSchematic = ({ sop, variables }: { sop: string, variables: string[] }) => {
  const [valStates, setValStates] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    variables.forEach(v => initial[v] = false);
    return initial;
  });
  const [selectedGate, setSelectedGate] = useState<{ type: 'AND' | 'OR' | 'NOT', index: number, data?: string[] } | null>(null);

  // Sync valStates if variables change
  React.useEffect(() => {
    setValStates(prev => {
      const next = { ...prev };
      variables.forEach(v => {
        if (!(v in next)) next[v] = false;
      });
      return next;
    });
  }, [variables]);

  const toggleVar = (v: string) => {
    setValStates(prev => ({ ...prev, [v]: !prev[v] }));
  };

  if (sop === "0" || sop === "1") {
    return (
      <div className="h-[240px] w-full bg-[#0a0b10] border border-[#2d3142] rounded flex flex-col items-center justify-center font-mono text-cyan-400 gap-2">
        <div className="text-[10px] text-[#5e6684] uppercase tracking-widest">Constant Termination</div>
        <div className="text-2xl font-black">{sop === "1" ? "VCC (1)" : "GND (0)"}</div>
      </div>
    );
  }

  // Parse terms
  const terms = sop.split('+').map(t => {
    const raw = t.trim().replace(/[\(\)]/g, '');
    return raw.split('·').map(l => l.trim());
  });

  const termResults = terms.map(literals => {
    return literals.every(lit => {
      const isInverted = lit.startsWith('!');
      const varName = isInverted ? lit.slice(1) : lit;
      const val = valStates[varName] || false;
      return isInverted ? !val : val;
    });
  });

  const finalResult = termResults.some(r => r);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#1a1c26] p-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-cyan-500/10 rounded border border-cyan-500/20">
            <Cpu size={14} className="text-cyan-400" />
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Interactive Logic Simulator</span>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setSelectedGate(null)}
             className="text-[8px] font-black hover:text-white text-[#5e6684] uppercase tracking-tighter transition-colors"
           >
             [Reset View]
           </button>
        </div>
      </div>

      <div className="relative min-h-[400px] w-full bg-[#08090d] border border-[#2d3142] rounded-xl overflow-hidden p-6 font-mono shadow-2xl">
         {/* Backdrop Grid */}
         <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 0)', backgroundSize: '20px 20px' }} />
         
         <div className="relative z-10 flex h-full gap-6">
            {/* Input Controls */}
            <div className="flex flex-col justify-center gap-6">
               <div className="text-[8px] text-cyan-500/50 uppercase font-black tracking-widest mb-2 transform -rotate-90 origin-left translate-x-2">Inputs</div>
               {variables.map((v, idx) => (
                 <div key={v} className="flex items-center gap-4">
                   <button 
                     onClick={() => toggleVar(v)}
                     className={cn(
                       "w-8 h-8 border flex items-center justify-center text-xs font-black transition-all hover:scale-110 active:scale-95 shadow-lg relative group/btn",
                       valStates[v] 
                         ? "bg-cyan-500 border-cyan-300 text-black shadow-cyan-500/20" 
                         : "bg-[#1a1c26] border-[#2d3142] text-[#5e6684] hover:border-cyan-500/40"
                     )}
                   >
                     {v}
                     <div className="absolute -top-1 -right-1 w-2 h-2 bg-white/20 rounded-full scale-0 group-hover/btn:scale-100 transition-transform" />
                   </button>
                   <div className={cn(
                     "w-8 h-[2px] transition-all duration-500",
                     valStates[v] ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee]" : "bg-[#2d3142]"
                   )} />
                 </div>
               ))}
            </div>

            {/* NOT Layer */}
            <div className="flex flex-col justify-center gap-6">
               {variables.map((v, i) => (
                 <div key={v} className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedGate({ type: 'NOT', index: i, data: [v] })}
                      className={cn(
                        "w-10 h-10 border rounded-full flex items-center justify-center relative transition-all duration-500 hover:scale-110",
                        !valStates[v] 
                          ? "bg-purple-500/10 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
                          : "bg-[#0a0b10] border-[#2d3142]"
                      )}
                    >
                       <div className={cn(
                         "text-[8px] font-black italic",
                         !valStates[v] ? "text-purple-400" : "text-[#5e6684]"
                       )}>NOT</div>
                       <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-inherit bg-inherit" />
                    </button>
                    <div className={cn(
                      "w-6 h-[2px] transition-all duration-500",
                      !valStates[v] ? "bg-purple-400" : "bg-[#2d3142]"
                    )} />
                 </div>
               ))}
            </div>

            {/* AND Layer */}
            <div className="flex-1 flex flex-col justify-center gap-4 max-h-[350px] overflow-y-auto px-4 py-2 custom-scrollbar">
               {terms.map((literals, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.1 }}
                   className="relative flex items-center gap-4 group"
                 >
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/5 transition-colors" />
                    
                    <button 
                      onClick={() => setSelectedGate({ type: 'AND', index: i, data: literals })}
                      className={cn(
                        "flex-1 p-3 rounded-lg border transition-all duration-500 flex items-center justify-between group/gate text-left outline-none",
                        termResults[i] 
                          ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
                          : "bg-[#0a0b10] border-[#2d3142] hover:border-[#3d4359]"
                      )}
                    >
                       <div className="flex flex-col gap-1">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest",
                            termResults[i] ? "text-cyan-400" : "text-[#5e6684]"
                          )}>GATE_7408_{i}</span>
                          <div className="flex flex-wrap gap-1">
                             {literals.map((lit, li) => (
                               <span key={li} className="text-[10px] text-white/50">{lit}</span>
                             ))}
                          </div>
                       </div>
                       <Activity 
                         size={14} 
                         className={cn(
                           "transition-all duration-700",
                           termResults[i] ? "text-cyan-400" : "text-[#2d3142]"
                         )} 
                       />
                    </button>

                    <div className={cn(
                      "w-8 h-[2px] transition-all duration-700",
                      termResults[i] ? "bg-cyan-400" : "bg-[#2d3142]"
                    )} />
                 </motion.div>
               ))}
            </div>

            {/* OR Layer */}
            <div className="flex flex-col justify-center items-center gap-2 px-6">
               <button 
                  onClick={() => setSelectedGate({ type: 'OR', index: 0, data: terms.map(t => t.join('·')) })}
                  className="relative group outline-none"
               >
                  <div className={cn(
                    "absolute inset-0 blur-xl opacity-20 transition-all duration-1000",
                    finalResult ? "bg-amber-400 scale-150" : "bg-transparent"
                  )} />
                  
                  <motion.div 
                    animate={{ rotate: finalResult ? 135 : 45 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className={cn(
                      "w-16 h-16 border-2 flex items-center justify-center rounded-lg transition-all duration-700 cursor-pointer hover:scale-110",
                      finalResult 
                        ? "bg-amber-500/20 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]" 
                        : "bg-[#0a0b10] border-[#2d3142]"
                    )}
                  >
                     <div className={cn(
                       "transition-all duration-700 font-black flex flex-col items-center",
                       finalResult ? "text-amber-400 -rotate-[135deg]" : "text-[#2d3142] -rotate-45"
                     )}>
                        <span className="text-[10px]">7432</span>
                        <Zap size={16} />
                     </div>
                  </motion.div>
               </button>

               <div className="mt-8 flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-10 h-10 rounded shadow-inner border flex items-center justify-center text-xl font-black transition-all duration-1000",
                    finalResult 
                      ? "bg-amber-500 border-amber-300 text-black shadow-[0_0_50px_rgba(245,158,11,0.6)]" 
                      : "bg-[#0a0b10] border-[#2d3142] text-[#1a1c26]"
                  )}>
                     {finalResult ? "1" : "0"}
                  </div>
               </div>
            </div>

            {/* Click info Overlay */}
            {selectedGate && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-x-0 bottom-0 m-4 p-4 bg-[#1a1c26]/95 backdrop-blur border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{selectedGate.type} Unit Diagnostics</div>
                      <div className="text-[8px] text-[#5e6684] font-mono">ReferenceID: GATE_{selectedGate.type}_{selectedGate.index}</div>
                   </div>
                   <button onClick={() => setSelectedGate(null)} className="text-[#5e6684] hover:text-white"><RefreshCw size={12} /></button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 items-end">
                   <div className="space-y-2">
                      <div className="text-[8px] text-[#5e6684] uppercase font-bold">Input Signals</div>
                      <div className="flex flex-wrap gap-2">
                         {selectedGate.data?.map((d, i) => (
                           <div key={i} className="flex flex-col items-center p-1.5 bg-black/40 rounded border border-white/5">
                              <span className="text-[9px] text-white font-mono">{d}</span>
                              <span className="text-[7px] text-cyan-500 font-black">
                                {d.startsWith('!') ? (valStates[d.slice(1)] ? '0' : '1') : (valStates[d] ? '1' : '0')}
                              </span>
                           </div>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-1 text-right">
                      <div className="text-[8px] text-[#5e6684] uppercase font-bold">Local Output</div>
                      <div className={cn(
                        "text-2xl font-black font-mono",
                        (selectedGate.type === 'AND' ? termResults[selectedGate.index] : 
                         selectedGate.type === 'OR' ? finalResult :
                         !valStates[selectedGate.data![0]]) ? "text-cyan-400" : "text-[#2d3142]"
                      )}>
                        {(selectedGate.type === 'AND' ? termResults[selectedGate.index] : 
                          selectedGate.type === 'OR' ? finalResult :
                          !valStates[selectedGate.data![0]]) ? '1' : '0'}
                      </div>
                   </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-white/5 flex justify-between">
                   <span className="text-[7px] text-[#5e6684] uppercase italic">Real-time vector: {selectedGate.data?.join(selectedGate.type === 'AND' ? ' ∧ ' : ' ∨ ')}</span>
                   <span className="text-[7px] text-cyan-500/50 font-mono">Prop_Delay: 12ns</span>
                </div>
              </motion.div>
            )}
         </div>
      </div>
      
      <div className="flex justify-between items-center px-2">
        <div className="flex gap-4">
           {variables.map(v => (
             <div key={v} className="flex flex-col">
               <span className="text-[7px] text-[#5e6684] uppercase mb-1">{v} IN</span>
               <span className={cn("text-[8px] font-black font-mono", valStates[v] ? "text-cyan-400" : "text-[#2d3142]")}>
                 {valStates[v] ? 'HIGH' : 'LOW'}
               </span>
             </div>
           ))}
        </div>
        <p className="text-[8px] text-cyan-500/40 italic uppercase flex items-center gap-2">
           <Zap size={10} /> Click gates and inputs for detailed diagnostic streams.
        </p>
      </div>
    </div>
  );
}

// --- Components ---

const Card = ({ children, title, icon: Icon, className }: { children: React.ReactNode, title: string, icon?: any, className?: string }) => (
  <div className={cn("bg-[#12141d] border border-[#2d3142] rounded-lg overflow-hidden flex flex-col", className)}>
    <div className="px-5 py-3 border-b border-[#2d3142] bg-[#12141d] flex items-center justify-between">
      <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon size={14} className="text-cyan-500" />}
        {title}
      </h3>
    </div>
    <div className="p-5 flex-1">
      {children}
    </div>
  </div>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full bg-[#0a0b10] border border-[#2d3142] p-3 font-mono text-xl text-cyan-400 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-[#2d3142]",
      className
    )}
    {...props}
  />
));

const Button = ({ children, variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' }) => {
  const variants = {
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest text-[11px]",
    secondary: "bg-[#1a1c26] text-white hover:bg-[#2d3142] text-[11px] uppercase tracking-widest",
    outline: "border border-[#2d3142] text-[#a0a5b8] hover:bg-white/5 text-[11px] uppercase tracking-widest"
  };
  return (
    <button
      className={cn("px-4 py-2.5 rounded transition-all active:scale-95 disabled:opacity-50", variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Logic Components ---

const BitRegister = ({ bits }: { bits: string }) => {
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {bits.split('').map((bit, i) => {
        let color = "text-[#5e6684]";
        let bg = "bg-[#0a0b10]";
        let border = "border-[#2d3142]";
        
        if (i === 0) { // Sign
          color = "text-cyan-400";
          border = "border-cyan-500/50";
          bg = "bg-cyan-500/5";
        } else if (i > 0 && i < 9) { // Exponent
          color = "text-white";
          border = "border-white/20";
        } else { // Mantissa
          color = "text-amber-500";
          border = "border-amber-500/30";
          bg = "bg-amber-500/5";
        }

        return (
          <div key={i} className={cn(
            "w-5 h-8 border flex items-center justify-center text-[10px] font-mono font-bold rounded-sm transition-all hover:scale-110 cursor-default",
            bg, border, color
          )}>
            {bit}
          </div>
        );
      })}
    </div>
  );
};

const KMap = ({ table, variables }: { table: any[], variables: string[] }) => {
  if (variables.length < 2 || variables.length > 3) return null;

  // 2-variable K-Map (A, B)
  if (variables.length === 2) {
    const grid = [
      [table[0].output, table[1].output], // A=0: B=0, B=1
      [table[2].output, table[3].output]  // A=1: B=0, B=1
    ];

    return (
      <div className="space-y-4">
        <div className="text-[10px] text-[#5e6684] uppercase font-bold text-center">Karnaugh Map [2-Variable]</div>
        <div className="flex justify-center">
           <div className="grid grid-cols-3 grid-rows-3 gap-1 font-mono text-[10px]">
              <div />
              <div className="flex items-center justify-center text-cyan-500">B=0</div>
              <div className="flex items-center justify-center text-cyan-500">B=1</div>
              <div className="flex items-center justify-center text-amber-500">A=0</div>
              <div className={cn("w-10 h-10 border flex items-center justify-center rounded", grid[0][0] ? "bg-cyan-500/20 border-cyan-500 text-white" : "border-[#2d3142] text-[#2d3142]")}>{grid[0][0]}</div>
              <div className={cn("w-10 h-10 border flex items-center justify-center rounded", grid[0][1] ? "bg-cyan-500/20 border-cyan-500 text-white" : "border-[#2d3142] text-[#2d3142]")}>{grid[0][1]}</div>
              <div className="flex items-center justify-center text-amber-500">A=1</div>
              <div className={cn("w-10 h-10 border flex items-center justify-center rounded", grid[1][0] ? "bg-cyan-500/20 border-cyan-500 text-white" : "border-[#2d3142] text-[#2d3142]")}>{grid[1][0]}</div>
              <div className={cn("w-10 h-10 border flex items-center justify-center rounded", grid[1][1] ? "bg-cyan-500/20 border-cyan-500 text-white" : "border-[#2d3142] text-[#2d3142]")}>{grid[1][1]}</div>
           </div>
        </div>
      </div>
    );
  }

  // 3-variable K-Map (A, BC) - Gray code order: 00, 01, 11, 10
  const grayMap = [0, 1, 3, 2];
  const grid3 = [
    grayMap.map(v => table[v].output),      // A=0
    grayMap.map(v => table[v + 4].output)   // A=1
  ];

  return (
    <div className="space-y-4">
      <div className="text-[10px] text-[#5e6684] uppercase font-bold text-center">Minimized K-Mapping [3-Var]</div>
      <div className="flex justify-center overflow-x-auto pb-2">
         <div className="grid grid-cols-5 gap-1 font-mono text-[10px]">
            <div />
            {['00', '01', '11', '10'].map(v => <div key={v} className="text-center text-cyan-500">{v}</div>)}
            <div className="text-amber-500 pr-2">A=0</div>
            {grid3[0].map((val, i) => (
              <div key={i} className={cn("w-10 h-10 border flex items-center justify-center rounded", val ? "bg-cyan-500/20 border-cyan-500 text-white" : "border-[#2d3142] text-[#2d3142]")}>{val}</div>
            ))}
            <div className="text-amber-500 pr-2">A=1</div>
            {grid3[1].map((val, i) => (
              <div key={i} className={cn("w-10 h-10 border flex items-center justify-center rounded", val ? "bg-cyan-500/20 border-cyan-500 text-white" : "border-[#2d3142] text-[#2d3142]")}>{val}</div>
            ))}
         </div>
      </div>
    </div>
  );
};

const LogicGateIdentity = () => {
  const gates = [
    { name: 'AND', sym: '·', logic: 'A ∧ B', desc: 'True if both inputs are High' },
    { name: 'OR', sym: '+', logic: 'A ∨ B', desc: 'True if either input is High' },
    { name: 'XOR', sym: '⊕', logic: 'A ⊻ B', desc: 'True if inputs differ' },
    { name: 'NAND', sym: '↑', logic: 'A ⊼ B', desc: 'Inverse of AND' },
    { name: 'NOR', sym: '↓', logic: 'A ⊽ B', desc: 'Inverse of OR' },
    { name: 'XNOR', sym: '⊙', logic: 'A ≡ B', desc: 'Inverse of XOR' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {gates.map(gate => (
        <div key={gate.name} className="p-3 bg-[#0a0b10] border border-[#2d3142] rounded hover:border-cyan-500/40 transition-colors group">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-white">{gate.name}</span>
            <span className="text-[14px] text-cyan-400 font-mono group-hover:scale-125 transition-transform">{gate.sym}</span>
          </div>
          <div className="text-[8px] text-cyan-500/60 font-mono mb-2">{gate.logic}</div>
          <p className="text-[7px] text-[#5e6684] leading-tight uppercase">{gate.desc}</p>
        </div>
      ))}
    </div>
  );
};

const RippleCarryAdder = ({ valA, valB }: { valA: string, valB: string }) => {
  const bitsA = valA.padStart(4, '0').split('').reverse();
  const bitsB = valB.padStart(4, '0').split('').reverse();
  
  const carries = [0];
  const sums = [];
  for (let i = 0; i < 4; i++) {
    const a = parseInt(bitsA[i]) || 0;
    const b = parseInt(bitsB[i]) || 0;
    const cin = carries[i];
    sums.push(a ^ b ^ cin);
    carries.push((a & b) | (cin & (a ^ b)));
  }

  return (
    <div className="mt-8 p-6 bg-[#0a0b10] border border-[#2d3142] rounded-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500/10 border-b border-l border-white/5 text-[7px] font-black text-cyan-400 uppercase tracking-widest">PROPAGATION_BUS_v1</div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
           <Cpu size={12} className="text-cyan-500" />
           <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em]">4-Bit Cascaded Adder</h3>
        </div>
        <p className="text-[7px] text-[#5e6684] uppercase font-bold tracking-tighter italic">Ripple Carry Simulation [Signal Flow Analysis]</p>
      </div>

      <div className="flex flex-row-reverse justify-center gap-4">
        {sums.map((sum, i) => {
           const idx = i;
           const isLast = i === 3;
           return (
             <div key={idx} className="flex flex-col gap-3 items-center">
                <div className="flex flex-col gap-1 items-center pb-2 border-b border-white/5 w-full">
                   <div className={cn("text-[9px] font-mono", bitsA[idx] === '1' ? "text-cyan-400" : "text-[#2d3142]")}>{bitsA[idx]}</div>
                   <div className={cn("text-[9px] font-mono", bitsB[idx] === '1' ? "text-cyan-400" : "text-[#2d3142]")}>{bitsB[idx]}</div>
                </div>

                <div className={cn(
                  "w-10 h-14 rounded border flex flex-col items-center justify-center transition-all duration-700 relative",
                  sum === 1 ? "bg-cyan-500/10 border-cyan-400/50" : "bg-black/40 border-[#2d3142]"
                )}>
                   <div className="text-[6px] font-black text-cyan-500/30">FA_{idx}</div>
                   <div className={cn("text-base font-mono font-bold", sum === 1 ? "text-cyan-400" : "text-[#2d3142]")}>{sum}</div>
                   
                   {!isLast && (
                     <div className={cn(
                       "absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-px border-t border-dashed",
                       carries[i+1] === 1 ? "border-amber-400" : "border-[#2d3142]"
                     )}>
                        {carries[i+1] === 1 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[5px] text-amber-500 font-black">C{i+1}</div>}
                     </div>
                   )}
                </div>

                <div className={cn("text-[9px] font-black font-mono", sum === 1 ? "text-white" : "text-[#1a1c26]")}>{sum}</div>
             </div>
           );
        })}
        <div className="flex flex-col gap-3 items-center justify-end h-full">
           <div className={cn(
             "w-8 h-14 rounded border border-dashed flex flex-col items-center justify-center",
             carries[4] === 1 ? "bg-amber-500/5 border-amber-500/40" : "border-[#2d3142] opacity-20"
           )}>
              <div className="text-[5px] font-black text-amber-500">COUT</div>
              <div className={cn("text-xs font-mono font-bold", carries[4] === 1 ? "text-amber-400" : "text-[#1a1c26]")}>{carries[4]}</div>
           </div>
           <div className="text-[9px] font-black text-amber-500 opacity-40">{carries[4]}</div>
        </div>
      </div>
    </div>
  );
};

const FullAdder = ({ x, y, cin }: { x: number, y: number, cin: number }) => {
  const sum = x ^ y ^ cin;
  const cout = (x & y) | (cin & (x ^ y));
  const xor1 = x ^ y;
  const and1 = x & y;
  const and2 = cin & xor1;
  
  return (
    <div className="p-6 bg-[#08090d] border border-[#2d3142] rounded-2xl mt-8 shadow-2xl relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 0)', backgroundSize: '16px 16px' }} />
      <div className="absolute -right-20 -top-20 w-40 h-40 bg-cyan-500/10 blur-[80px] rounded-full" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Cpu size={16} className="text-cyan-400" />
             </div>
             <div>
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Bit-Slice Processor</h3>
                <p className="text-[7px] text-[#5e6684] uppercase font-bold tracking-tighter">Full Adder Architecture [L_UNIT_X1]</p>
             </div>
          </div>
          <div className="flex gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[7px] text-[#5e6684] uppercase">Latency</span>
                <span className="text-[9px] font-mono text-cyan-400">1.2ns</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[7px] text-[#5e6684] uppercase">Status</span>
                <span className="text-[9px] font-mono text-green-500 group-hover:animate-pulse">ACTIVE_SYNC</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Inputs Section */}
          <div className="lg:col-span-2 space-y-4">
             {[
               { id: 'A', val: x, label: 'INPUT_A', color: 'bg-cyan-500' },
               { id: 'B', val: y, label: 'INPUT_B', color: 'bg-cyan-500' },
               { id: 'Cin', val: cin, label: 'CARRY_IN', color: 'bg-amber-500' }
             ].map(input => (
               <div key={input.id} className="p-3 bg-black/40 border border-[#2d3142] rounded-xl relative group/input hover:border-white/10 transition-all">
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-[7px] font-black text-[#5e6684] uppercase tracking-widest">{input.label}</span>
                     <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]", input.val === 1 ? input.color : "bg-[#1a1c26]")} />
                  </div>
                  <div className={cn("text-xl font-mono text-center transition-all", input.val === 1 ? "text-white scale-110" : "text-[#2d3142]")}>{input.val}</div>
               </div>
             ))}
          </div>

          {/* Logic Gates Diagram */}
          <div className="lg:col-span-8 relative min-h-[220px] flex items-center justify-center">
            <svg width="100%" height="220" viewBox="0 0 500 220" className="opacity-90">
              {/* Internal Signal Paths */}
              <line x1="40" y1="40" x2="100" y2="60" stroke={x ? "#22d3ee" : "#2d3142"} strokeWidth="1.5" />
              <line x1="40" y1="80" x2="100" y2="80" stroke={y ? "#22d3ee" : "#2d3142"} strokeWidth="1.5" />
              <rect x="100" y="50" width="60" height="50" rx="4" fill="#0c1018" stroke={xor1 ? "#22d3ee" : "#2d3142"} strokeWidth="1.5" />
              <text x="130" y="80" textAnchor="middle" className="text-[10px] font-black fill-white/30" pointerEvents="none">XOR</text>

              <line x1="160" y1="75" x2="220" y2="40" stroke={xor1 ? "#22d3ee" : "#2d3142"} strokeWidth="1.5" />
              <line x1="40" y1="120" x2="220" y2="70" stroke={cin ? "#f59e0b" : "#2d3142"} strokeWidth="1.5" />
              <rect x="220" y="30" width="60" height="60" rx="4" fill="#0c1018" stroke={sum ? "#22d3ee" : "#2d3142"} strokeWidth="1.5" />
              <text x="250" y="65" textAnchor="middle" className="text-[10px] font-black fill-white/30" pointerEvents="none">XOR</text>

              <rect x="320" y="125" width="60" height="50" rx="4" fill="#0c1018" stroke={cout ? "#f59e0b" : "#2d3142"} strokeWidth="1.5" />
              <text x="350" y="155" textAnchor="middle" className="text-[10px] font-black fill-white/30" pointerEvents="none">OR</text>

              {/* Final Outputs */}
              <line x1="280" y1="60" x2="440" y2="60" stroke={sum ? "#22d3ee" : "#2d3142"} strokeWidth="2" />
              <line x1="380" y1="150" x2="440" y2="150" stroke={cout ? "#f59e0b" : "#2d3142"} strokeWidth="2" />
              <circle cx="440" cy="60" r="4" fill={sum ? "#22d3ee" : "#2d3142"} />
              <circle cx="440" cy="150" r="4" fill={cout ? "#f59e0b" : "#2d3142"} />
            </svg>
          </div>

          {/* Outputs Section */}
          <div className="lg:col-span-2 space-y-4">
             <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl relative group shadow-[0_0_20px_rgba(6,182,212,0.05)]">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest italic font-serif">SUM (Σ)</span>
                   <div className={cn("w-1.5 h-1.5 rounded-full", sum === 1 ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee]" : "bg-[#1a1c26]")} />
                </div>
                <div className={cn("text-3xl font-mono text-center transition-all duration-700", sum === 1 ? "text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" : "text-[#2d3142]")}>{sum}</div>
             </div>

             <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl relative group">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest italic font-serif">COUT (Cₒ)</span>
                   <div className={cn("w-1.5 h-1.5 rounded-full", cout === 1 ? "bg-amber-400 shadow-[0_0_10px_#f59e0b]" : "bg-[#1a1c26]")} />
                </div>
                <div className={cn("text-3xl font-mono text-center transition-all duration-700", cout === 1 ? "text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "text-[#2d3142]")}>{cout}</div>
             </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap gap-4 justify-between items-center text-[8px] font-mono uppercase tracking-[0.1em]">
           <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-0.5 bg-cyan-500" />
                 <span className="text-[#a0a5b8]">Signal Logic Channel</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-0.5 bg-amber-500" />
                 <span className="text-[#a0a5b8]">Carry Propagation Path</span>
              </div>
           </div>
           <div className="text-cyan-500/40 italic">
             Verification Protocol: Verified_X86_COMPAT
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'arithmetic' | 'conversion' | 'logic' | 'visuals' | 'standards' | 'guide'>('arithmetic');
  
  // Arithmetic State
  const [op, setOp] = useState<'add' | 'sub' | 'mul' | 'div' | 'and' | 'or' | 'xor' | 'nand' | 'nor' | 'xnor'>('add');
  const [valA, setValA] = useState('1101');
  const [valB, setValB] = useState('1011');
  const [bitWidth, setBitWidth] = useState(8);
  const [arithResult, setArithResult] = useState<any>(null);

  // Conversion State
  const [convVal, setConvVal] = useState('42');
  const [fromBase, setFromBase] = useState(10);
  const [tableBits, setTableBits] = useState(4);

  // Floating Point State (Standards)
  const [floatInput, setFloatInput] = useState('42.5');
  const floatResult = useMemo(() => {
    const val = parseFloat(floatInput);
    if (isNaN(val)) return null;
    return floatToIEEE754(val);
  }, [floatInput]);

  // Hamming State
  const [hammingInput, setHammingInput] = useState('1011');
  const hammingResult = useMemo(() => encodeHamming74(hammingInput), [hammingInput]);

  // Logic State
  const [numVars, setNumVars] = useState(3);
  const [ttOutcome, setTtOutcome] = useState('0,1,1,0,1,0,0,1');
  const [expression, setExpression] = useState('A(B+C)');

  // Reference Table State
  const [refSearch, setRefSearch] = useState('');
  const [refWidth, setRefWidth] = useState(8);
  const refData = useMemo(() => generateReferenceData(0, 511, refWidth), [refWidth]);
  const filteredRefData = useMemo(() => {
    if (!refSearch) return refData.slice(0, 50);
    const s = refSearch.toLowerCase();
    return refData.filter(d => 
      d.dec.toString().includes(s) || 
      d.bin.includes(s) || 
      d.hex.toLowerCase().includes(s)
    ).slice(0, 100);
  }, [refData, refSearch]);
  const logicData = useMemo(() => synthesizeLogic(numVars, ttOutcome.split(',')), [numVars, ttOutcome]);
  
  const expressionResult = useMemo(() => {
    if (!expression.trim()) return null;
    return LogicSolver.solveFull(expression);
  }, [expression]);

  const handleSyncExpression = () => {
    if (!expressionResult) return;
    
    // Determine how many variables are in the expression
    const vars = expressionResult.variables;
    const vCount = vars.length;
    
    // Update bit-width if necessary (min 2, max 4 for this UI)
    const targetVars = Math.max(2, Math.min(4, vCount));
    setNumVars(targetVars);
    
    // Generate the bitstring for the synthesis module
    // We need to re-evaluate if the expression variables don't match A, B, C...
    // But usually we assume they do.
    const rows = Math.pow(2, targetVars);
    const newOutcome = [];
    for (let i = 0; i < rows; i++) {
        const state: Record<string, boolean> = {};
        for (let v = 0; v < targetVars; v++) {
            state[String.fromCharCode(65 + v)] = !!((i >> (targetVars - 1 - v)) & 1);
        }
        newOutcome.push(LogicSolver.evaluate(expression, state) ? "1" : "0");
    }
    setTtOutcome(newOutcome.join(','));
  };

  const handleCompute = () => {
    try {
      if (op === 'add') setArithResult(addBinary(valA, valB, bitWidth));
      else if (op === 'sub') setArithResult(subBinary(valA, valB, bitWidth));
      else if (op === 'mul') setArithResult(multiplyBinary(valA, valB, bitWidth));
      else if (op === 'div') setArithResult(divideBinary(valA, valB, bitWidth));
      else if (op === 'and') setArithResult(andBinary(valA, valB, bitWidth));
      else if (op === 'or') setArithResult(orBinary(valA, valB, bitWidth));
      else if (op === 'xor') setArithResult(xorBinary(valA, valB, bitWidth));
      else if (op === 'nand') setArithResult(nandBinary(valA, valB, bitWidth));
      else if (op === 'nor') setArithResult(norBinary(valA, valB, bitWidth));
      else if (op === 'xnor') setArithResult(xnorBinary(valA, valB, bitWidth));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-screen bg-[#0a0b10] text-[#a0a5b8] font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-[#12141d] border-b border-[#2d3142] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyan-500 rounded-sm flex items-center justify-center text-black font-bold text-xs">B+</div>
          <div>
            <h1 className="text-white font-bold tracking-wider text-sm uppercase">Bit_Architect // Pro_Lab</h1>
            <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-[0.2em]">Advanced Binary Arithmetic & Logic Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 font-mono text-[11px]">
          <div className="flex flex-col items-end">
            <span className="text-white">SYSTEM_STATUS: <span className="text-green-400 animate-pulse uppercase">Active</span></span>
            <span className="opacity-50 text-[9px]">V_1.0.4 // CORE_V3</span>
          </div>
          <div className="w-px h-8 bg-[#2d3142]"></div>
          <div className="text-right uppercase">
            <div className="text-white">0xFFFF_AD04</div>
            <div className="opacity-50">Memory Trace</div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar Navigation */}
        <nav className="w-56 bg-[#0e1017] border-r border-[#2d3142] flex flex-col p-4 gap-2 shrink-0 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-[#5e6684] mb-2 font-bold px-2">Calculators</div>
          <button 
            onClick={() => setActiveTab('arithmetic')}
            className={cn(
              "w-full text-left p-3 text-xs rounded transition-all flex items-center gap-3",
              activeTab === 'arithmetic' ? "bg-cyan-900/20 text-cyan-400 border border-cyan-500/30" : "hover:bg-white/5 text-[#a0a5b8]"
            )}
          >
            <Calculator size={14} /> Arithmetic Core
          </button>
          <button 
            onClick={() => setActiveTab('conversion')}
            className={cn(
              "w-full text-left p-3 text-xs rounded transition-all flex items-center gap-3",
              activeTab === 'conversion' ? "bg-cyan-900/20 text-cyan-400 border border-cyan-500/30" : "hover:bg-white/5 text-[#a0a5b8]"
            )}
          >
            <ArrowRightLeft size={14} /> Base Converter
          </button>
          
          <div className="text-[10px] uppercase tracking-widest text-[#5e6684] mt-6 mb-2 font-bold px-2">Logic Synthesis</div>
          <button 
            onClick={() => setActiveTab('logic')}
            className={cn(
              "w-full text-left p-3 text-xs rounded transition-all flex items-center gap-3",
              activeTab === 'logic' ? "bg-cyan-900/20 text-cyan-400 border border-cyan-500/30" : "hover:bg-white/5 text-[#a0a5b8]"
            )}
          >
            <Cpu size={14} /> Truth Table / SOP
          </button>
          <button 
            onClick={() => setActiveTab('visuals')}
            className={cn(
              "w-full text-left p-3 text-xs rounded transition-all flex items-center gap-3",
              activeTab === 'visuals' ? "bg-cyan-900/20 text-cyan-400 border border-cyan-500/30" : "hover:bg-white/5 text-[#a0a5b8]"
            )}
          >
            <BarChart3 size={14} /> Frequency Analytics
          </button>
          <button 
            onClick={() => setActiveTab('standards')}
            className={cn(
              "w-full text-left p-3 text-xs rounded transition-all flex items-center gap-3",
              activeTab === 'standards' ? "bg-cyan-900/20 text-cyan-400 border border-cyan-500/30" : "hover:bg-white/5 text-[#a0a5b8]"
            )}
          >
            <Layers size={14} /> Floating Point
          </button>
          <button 
            onClick={() => setActiveTab('data-hub')}
            className={cn(
              "w-full text-left p-3 text-xs rounded transition-all flex items-center gap-3",
              activeTab === 'data-hub' ? "bg-cyan-900/20 text-cyan-400 border border-cyan-500/30" : "hover:bg-white/5 text-[#a0a5b8]"
            )}
          >
            <Hash size={14} /> Data Dictionary
          </button>

          <div className="text-[10px] uppercase tracking-widest text-[#5e6684] mt-6 mb-2 font-bold px-2">Knowledge Base</div>
          <button 
            onClick={() => setActiveTab('guide')}
            className={cn(
              "w-full text-left p-3 text-xs rounded transition-all flex items-center gap-3",
              activeTab === 'guide' ? "bg-cyan-900/20 text-cyan-400 border border-cyan-500/30" : "hover:bg-white/5 text-[#a0a5b8]"
            )}
          >
            <BookOpen size={14} /> Lab Manual
          </button>

          <div className="mt-auto p-4 bg-[#1a1c26] rounded border border-white/5">
            <div className="text-[9px] text-[#5e6684] mb-2 uppercase font-bold">Module Load</div>
            <div className="w-full h-1.5 bg-[#0a0b10] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "85%" }}
                className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
              ></motion.div>
            </div>
            <div className="flex justify-between mt-2 font-mono text-[8px] text-[#5e6684 uppercase\">
              <span>Allocated</span>
              <span>85%</span>
            </div>
          </div>
        </nav>

        {/* Workspace Workspace */}
        <main className="flex-1 bg-[#0a0b10] p-6 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'arithmetic' && (
              <motion.div
                key="arithmetic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-4 space-y-6">
                  <Card title="Configuration" icon={Calculator}>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Operation</label>
                        <select 
                          value={op} 
                          onChange={(e) => setOp(e.target.value as any)}
                          className="w-full bg-[#0a0b10] border border-[#2d3142] p-3 text-xs text-white uppercase focus:outline-none focus:border-cyan-500"
                        >
                          <option value="add">Binary Addition</option>
                          <option value="sub">2's Comp Subtraction</option>
                          <option value="mul">Binary Multiplication</option>
                          <option value="div">Binary Division</option>
                          <option className="text-cyan-500 font-bold" disabled>-- Bitwise Gates --</option>
                          <option value="and">Bitwise AND</option>
                          <option value="or">Bitwise OR</option>
                          <option value="xor">Bitwise XOR</option>
                          <option value="nand">Bitwise NAND</option>
                          <option value="nor">Bitwise NOR</option>
                          <option value="xnor">Bitwise XNOR</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Bit Width</label>
                          <input 
                            type="number" 
                            value={isNaN(bitWidth) ? "" : bitWidth} 
                            onChange={(e) => setBitWidth(parseInt(e.target.value))}
                            className="w-full bg-[#0a0b10] border border-[#2d3142] p-2 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Mode</label>
                          <div className="h-8 bg-[#0a0b10] border border-[#2d3142] flex items-center justify-center text-[9px] text-cyan-500 font-bold uppercase">
                            Std_Binary
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Value A</label>
                          <div className="text-[9px] opacity-40 font-mono">DEC: {parseInt(valA || '0', 2)}</div>
                        </div>
                        <Input value={valA} onChange={(e) => setValA(e.target.value.replace(/[^01]/g, ""))} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Value B</label>
                          <div className="text-[9px] opacity-40 font-mono">DEC: {parseInt(valB || '0', 2)}</div>
                        </div>
                        <Input value={valB} onChange={(e) => setValB(e.target.value.replace(/[^01]/g, ""))} />
                      </div>
                      <Button onClick={handleCompute} className="w-full py-4 mt-2">Execute_Compute</Button>
                    </div>
                  </Card>

                  <div className="bg-[#12141d] border border-cyan-500/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-500 uppercase mb-3 font-mono">
                      <Info size={12} /> Reference_Key
                    </div>
                    <div className="space-y-2 text-[10px] leading-relaxed">
                      <p><span className="text-white font-bold tracking-widest">MSB:</span> Terminal bit indicating polarity or magnitude.</p>
                      <p><span className="text-white font-bold tracking-widest">TRACE:</span> Logical sequence of per-bit carry propagation.</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  <Card title="Input & Operation Trace" icon={Layers}>
                    {!arithResult ? (
                      <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-[#2d3142] border-2 border-dashed border-[#2d3142] rounded-lg">
                        <RefreshCw size={48} className="mb-4 opacity-20" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40">Waiting for system sequence...</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0a0b10] p-4 border border-[#2d3142] rounded">
                              <div className="text-[9px] text-[#5e6684] uppercase font-bold mb-1">Binary_Output</div>
                              <div className="text-2xl font-mono text-cyan-400 tracking-wider truncate">{arithResult.binary}</div>
                            </div>
                            <div className="bg-[#0a0b10] p-4 border border-[#2d3142] rounded">
                              <div className="text-[9px] text-[#5e6684] uppercase font-bold mb-1">Decimal_Result</div>
                              <div className="text-2xl font-mono text-white tracking-wider">{arithResult.decimal}</div>
                            </div>
                         </div>

                         <div className="bg-[#0a0b10] border border-[#2d3142] rounded-lg overflow-hidden">
                            <div className="bg-[#1a1c26] px-4 py-2 border-b border-[#2d3142] flex justify-between items-center">
                              <span className="text-[9px] font-bold text-cyan-500 uppercase font-mono">Trace_Log_V4.2.0</span>
                              <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-40"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-20"></div>
                              </div>
                            </div>
                            <div className="p-6 font-mono text-[11px] leading-6 max-h-[350px] overflow-y-auto">
                              {arithResult.steps.map((step: any, idx: number) => (
                                <div key={idx} className="flex border-b border-[#1a1c26] last:border-0 hover:bg-white/5 transition-colors">
                                  <div className="w-24 shrink-0 py-2 text-[#5e6684] font-bold uppercase text-[9px]">[{String(idx+1).padStart(2,'0')}] {step.label}</div>
                                  <div className={cn(
                                    "py-2 font-bold tracking-[0.3em] overflow-hidden truncate",
                                    step.type === 'carry' ? "text-amber-500 opacity-60" :
                                    step.type === 'result' ? "text-cyan-400 bg-cyan-500/5 px-2" :
                                    "text-white"
                                  )}>
                                    {step.value}
                                  </div>
                                  {step.description && <div className="py-2 ml-4 text-[9px] opacity-40 italic flex-1 truncate">// {step.description}</div>}
                                </div>
                              ))}
                            </div>
                         </div>
                      </div>
                    )}
                  </Card>

                  {arithResult && (
                    <div className="mt-6">
                      <Card title="Signed Representation Analysis" icon={Info}>
                         <div className="p-1">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <div className="bg-[#0a0b10] p-4 border border-[#2d3142] rounded hover:border-cyan-500/30 transition-colors">
                                 <div className="text-[8px] text-[#5e6684] uppercase font-bold mb-2">2's Complement</div>
                                 <div className="text-xl font-mono text-cyan-400">{getSignedInfo(arithResult.binary, bitWidth).twosComplement}</div>
                                 <div className="text-[7px] text-[#5e6684] mt-1 italic">Standard architecture default</div>
                               </div>
                               <div className="bg-[#0a0b10] p-4 border border-[#2d3142] rounded hover:border-amber-500/30 transition-colors">
                                 <div className="text-[8px] text-[#5e6684] uppercase font-bold mb-2">Sign-Magnitude</div>
                                 <div className="text-xl font-mono text-amber-500">{getSignedInfo(arithResult.binary, bitWidth).signMagnitude}</div>
                                 <div className="text-[7px] text-[#5e6684] mt-1 italic">Direct bit-to-sign mapping</div>
                               </div>
                               <div className="bg-[#0a0b10] p-4 border border-[#2d3142] rounded hover:border-purple-500/30 transition-colors">
                                 <div className="text-[8px] text-[#5e6684] uppercase font-bold mb-2">1's Complement</div>
                                 <div className="text-xl font-mono text-purple-400">{getSignedInfo(arithResult.binary, bitWidth).onesComplement}</div>
                                 <div className="text-[7px] text-[#5e6684] mt-1 italic">Bit-wise inverse notation</div>
                               </div>
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between p-3 bg-cyan-500/5 border border-cyan-500/10 rounded">
                               <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                                  <span className="text-[9px] font-bold text-white uppercase tracking-widest">Theoretical Range [{bitWidth}-bit]</span>
                               </div>
                               <span className="font-mono text-xs text-cyan-400 font-bold">{getSignedInfo(arithResult.binary, bitWidth).range}</span>
                            </div>

                            <FullAdder 
                               x={parseInt(valA.slice(-1)) || 0} 
                               y={parseInt(valB.slice(-1)) || 0} 
                               cin={op === 'sub' ? 1 : 0} 
                             />

                             <RippleCarryAdder 
                               valA={valA.slice(-4)} 
                               valB={valB.slice(-4)} 
                             />
                         </div>
                      </Card>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'conversion' && (
              <motion.div
                key="conversion"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <Card title="Multi-Base Converter Engine" icon={ArrowRightLeft}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="space-y-8">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Target Value</label>
                          <Input value={convVal} onChange={(e) => setConvVal(e.target.value)} placeholder="0x0 or 0b0..." />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Source Base Identification</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[10, 2, 16].map(b => (
                              <button 
                                key={b}
                                onClick={() => setFromBase(b)}
                                className={cn(
                                  "py-3 rounded border text-[10px] font-bold transition-all uppercase tracking-widest",
                                  fromBase === b ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-[#0a0b10] border-[#2d3142] text-[#5e6684]"
                                )}
                              >
                                {b === 10 ? 'Decimal' : b === 2 ? 'Binary' : 'Hex'}
                              </button>
                            ))}
                          </div>
                        </div>

                         <div className="pt-6 border-t border-[#2d3142]">
                           <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider mb-3 block">Reference Table Generator</label>
                           <div className="flex gap-4">
                              <Input 
                                type="number" 
                                value={isNaN(tableBits) ? "" : tableBits} 
                                onChange={(e) => setTableBits(parseInt(e.target.value))} 
                                className="w-24 text-xs p-2 h-10" 
                              />
                              <span className="text-[10px] items-center flex text-[#5e6684]">BITS (MAX 8)</span>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-3">
                        {(() => {
                          let dec = 0;
                          try { 
                            if (fromBase === 10) dec = parseInt(convVal, 10);
                            else if (fromBase === 2) dec = parseInt(convVal, 2);
                            else if (fromBase === 16) dec = parseInt(convVal.replace('0x', ''), 16);
                          } catch (e) { dec = NaN; }

                          if (isNaN(dec)) return <div className="p-8 border border-red-900/30 bg-red-900/5 text-red-500 text-[10px] font-mono uppercase">Error: NaN Detected in stream</div>;

                          return (
                            <>
                              {[2, 8, 10, 16].map(base => (
                                <div key={base} className="flex items-center justify-between p-4 bg-[#0a0b10] border border-[#2d3142] rounded hover:border-cyan-500/30 transition-all group">
                                  <div className="text-[9px] font-bold text-[#5e6684] uppercase tracking-widest">Base-{base}</div>
                                  <div className="font-mono text-xl font-bold text-white group-hover:text-cyan-400 transition-colors tracking-tight">
                                    {base === 16 ? dec.toString(base).toUpperCase().padStart(2, '0') : dec.toString(base)}
                                    <span className="text-[10px] opacity-20 ml-2">
                                      {base === 16 ? 'h' : base === 2 ? 'b' : 'd'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                     </div>
                  </div>
                </Card>

                {(() => {
                  let dec = 0;
                  try { 
                    if (fromBase === 10) dec = parseInt(convVal, 10);
                    else if (fromBase === 2) dec = parseInt(convVal, 2);
                    else if (fromBase === 16) dec = parseInt(convVal.replace('0x', ''), 16);
                  } catch (e) { dec = 0; }
                  if (isNaN(dec)) dec = 0;

                  return (
                    <div className="p-6 bg-black/40 border border-[#2d3142] rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-cyan-500/10 rounded-sm border border-cyan-500/20">
                            <Server size={18} className="text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Address Space Virtualization</h4>
                            <p className="text-[10px] text-[#5e6684] font-mono tracking-tight uppercase">
                               Simulating Memory Map Buffer @ RAM_SECTOR_0x{dec.toString(16).toUpperCase().padStart(4, '0')}
                            </p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[8px] font-black text-cyan-400 uppercase animate-pulse">
                           Live Architecture Sync
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-16 gap-3">
                         {Array.from({ length: 16 }).map((_, i) => (
                           <div 
                             key={i} 
                             className={cn(
                               "aspect-square rounded-md border flex flex-col items-center justify-center font-mono text-[10px] transition-all duration-500 relative group overflow-hidden",
                               i === (dec % 16) 
                                 ? "bg-cyan-500 border-cyan-400 text-black scale-110 shadow-[0_0_25px_rgba(6,182,212,0.6)] z-10" 
                                 : "bg-[#0a0b10] border-[#2d3142] text-[#2d3142]/40 hover:border-cyan-500/30"
                             )}
                           >
                              <span className={cn("text-[7px] mb-1 font-black", i === (dec % 16) ? "text-black/60" : "text-[#5e6684]")}>+{i}</span>
                              <span className="font-black">{i === (dec % 16) ? 'VAL' : '00'}</span>
                              
                              {i === (dec % 16) && (
                                <motion.div 
                                  layoutId="memory-glow"
                                  className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" 
                                />
                              )}
                           </div>
                         ))}
                      </div>
                      
                      <div className="mt-8 pt-4 border-t border-[#2d3142] flex justify-between items-center text-[9px] font-mono uppercase text-[#5e6684]">
                         <div className="flex gap-4">
                            <span>* Logical Offset: {dec % 16} Bytes</span>
                            <span>* Page Alignment: 0x{(Math.floor(dec / 16) * 16).toString(16).toUpperCase()}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-500" />
                            <span className="font-black text-white">Segment Active</span>
                         </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 gap-6">
                  <Card title={`Powers of 2 / Hex Reference Table (${tableBits}-bit)`} icon={Table}>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-[10px] font-mono">
                        <thead className="sticky top-0 bg-[#12141d]">
                          <tr className="text-[#5e6684] border-b border-[#2d3142]">
                            <th className="p-2 text-left">DECIMAL</th>
                            <th className="p-2 text-left">BINARY</th>
                            <th className="p-2 text-left">HEX</th>
                            <th className="p-2 text-left">GRAY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: Math.pow(2, Math.min(tableBits, 8)) }).map((_, i) => (
                            <tr key={i} className="border-b border-[#1a1c26] text-white/70">
                              <td className="p-2">{i}</td>
                              <td className="p-2 text-cyan-400">{i.toString(2).padStart(tableBits, '0')}</td>
                              <td className="p-2 uppercase">{i.toString(16).padStart(2, '0')}</td>
                              <td className="p-2 text-amber-500">{decToGray(i, tableBits)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'standards' && (
              <motion.div
                key="standards"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-12">
                   <Card title="IEEE-754 Single Precision (32-bit)" icon={Layers}>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                           <div className="space-y-2">
                             <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Floating Point Value</label>
                             <Input 
                               value={floatInput} 
                               onChange={(e) => setFloatInput(e.target.value)}
                               placeholder="e.g. -3.14159 or 42.5"
                               className="text-2xl"
                             />
                           </div>

                           <div className="p-6 bg-[#0a0b10] border border-[#2d3142] rounded-lg space-y-8">
                             <div className="flex flex-col gap-6">
                               <div className="space-y-3">
                                  <div className="text-[10px] text-[#5e6684] uppercase font-bold tracking-widest text-center mb-2">32-Bit Register Visualization</div>
                                  <BitRegister bits={floatResult?.bits || "0".repeat(32)} />
                               </div>

                               <div className="flex justify-between items-end border-b border-[#2d3142] pb-6 pt-2">
                                  <div className="space-y-1">
                                     <div className="text-[8px] text-cyan-400 uppercase font-black tracking-widest">Sign Bit [S]</div>
                                     <div className="text-4xl font-mono text-cyan-500 bg-cyan-500/5 px-4 py-1 rounded border border-cyan-500/20">{floatResult?.sign}</div>
                                  </div>
                                  <div className="space-y-1 flex-1 px-8">
                                     <div className="text-[8px] text-white uppercase font-black tracking-widest text-center">Biased Exponent [E]</div>
                                     <div className="text-3xl font-mono text-white text-center tracking-[0.2em] bg-white/5 py-1 rounded border border-white/10">{floatResult?.exponent}</div>
                                  </div>
                                  <div className="space-y-1">
                                     <div className="text-[8px] text-amber-500 uppercase font-black tracking-widest text-right">Fraction / Mantissa [M]</div>
                                     <div className="text-xl font-mono text-amber-500 text-right truncate max-w-[240px] bg-amber-500/5 px-3 py-1 rounded border border-amber-500/20">{floatResult?.mantissa}</div>
                                  </div>
                               </div>

                               <div className="flex justify-between items-center bg-black/40 p-3 rounded border border-white/5">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full border border-cyan-500/50 flex items-center justify-center text-[10px] text-cyan-400 font-bold bg-cyan-500/10">Hex</div>
                                     <div className="text-xl font-mono text-white tracking-widest uppercase">{floatResult?.hex}</div>
                                  </div>
                                  <div className="text-right">
                                     <div className="text-[8px] text-[#5e6684] uppercase font-bold tracking-widest">Implicit Bit Normalization</div>
                                     <div className="text-xs font-mono text-amber-400 italic">1.{floatResult?.mantissa.slice(0, 12)}...</div>
                                  </div>
                               </div>
                             </div>
                           </div>

                           <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded text-xs leading-relaxed text-white/80">
                              <p className="font-bold text-cyan-400 mb-2 uppercase text-[10px]">Calculation Formula:</p>
                              <code className="font-mono text-center block py-2 bg-black/20 rounded">
                                (-1)^S * 2^(E - 127) * (1 + M)
                              </code>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <Card title="Structural Breakdown Steps" className="border-cyan-500/10">
                              <div className="space-y-3 font-mono text-[10px]">
                                 {floatResult?.steps.map((step, idx) => (
                                   <div key={idx} className="flex border-b border-[#2d3142] last:border-0 py-2">
                                      <div className="w-24 shrink-0 text-[#a0a5b8] font-bold">{step.label}</div>
                                      <div className="flex-1 text-cyan-400 break-all">{step.value}</div>
                                      {step.description && <div className="ml-2 text-[#5e6684] italic">// {step.description}</div>}
                                   </div>
                                 ))}
                              </div>
                           </Card>
                        </div>
                     </div>
                   </Card>

                   <Card title="Error Correction: Hamming (7,4)" icon={ShieldCheck}>
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Input 4-Bit Data Word</label>
                            <Input 
                              placeholder="Bit sequence (e.g. 1011)" 
                              maxLength={4}
                              className="text-2xl font-mono tracking-widest text-center"
                              value={hammingInput}
                              onChange={(e) => setHammingInput(e.target.value.replace(/[^01]/g, "").slice(0, 4))}
                            />
                         </div>

                         <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded font-mono text-[11px]">
                            <div className="flex justify-between items-center mb-4">
                               <span className="text-[#5e6684] uppercase text-[9px] font-bold">Hamming Code Word:</span>
                               <span className="text-amber-500 font-bold tracking-[0.3em] text-lg">{hammingResult.encoded}</span>
                            </div>
                            <div className="space-y-2 border-t border-amber-500/10 pt-3 opacity-80 text-[8px] uppercase font-bold">
                               {hammingResult.steps.map((step, idx) => (
                                  <div key={idx} className="flex justify-between">
                                     <span className="text-[#5e6684]">{step.label}:</span>
                                     <span className="text-white">{step.value}</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                         <p className="text-[9px] text-[#5e6684] italic uppercase text-center leading-tight">
                            Adds parity bits at positions 1, 2, and 4 to allow 1-bit correction.
                         </p>
                      </div>
                   </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'logic' && (
              <motion.div
                key="logic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-5 space-y-6">
                  <Card title="Expression Solver (Advanced)" icon={Cpu}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Boolean Expression</label>
                          <Button 
                            variant="outline" 
                            className="h-6 text-[8px] border-cyan-500/20 hover:bg-cyan-500/10"
                            onClick={() => setExpression('')}
                          >
                            CLEAR
                          </Button>
                        </div>
                        <Input 
                          value={expression} 
                          onChange={(e) => setExpression(e.target.value)}
                          placeholder="e.g. (A*!B)+(!A*B)"
                          className="text-lg bg-[#0a0b10] font-mono"
                        />
                        <p className="text-[8px] text-[#5e6684] italic uppercase">Supports: A-Z, +, *, !, ( ), ', ⊕, ∧, ∨</p>
                      </div>

                      {expressionResult && (
                        <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                           <div className="flex justify-between items-start">
                              <div className="space-y-4 flex-1">
                                 <div>
                                   <div className="text-[8px] text-cyan-500 font-black uppercase mb-1 flex items-center gap-2">
                                     <Zap size={10} /> Sum of Products (Minimized)
                                   </div>
                                   <div className="text-xl font-mono text-white tracking-widest leading-none bg-black/20 p-2 rounded border border-white/5">{expressionResult.sop}</div>
                                 </div>
                                 
                                 <div>
                                   <div className="text-[8px] text-amber-500 font-black uppercase mb-1 flex items-center gap-2">
                                     <Zap size={10} /> Product of Sums (Minimized)
                                   </div>
                                   <div className="text-lg font-mono text-[#a0a5b8] tracking-widest leading-tight bg-black/20 p-2 rounded border border-white/5">{expressionResult.pos}</div>
                                 </div>
                              </div>
                              <Button 
                                onClick={handleSyncExpression}
                                className="h-8 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[9px] px-3 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0 ml-4"
                              >
                                SYNC TO TABLE
                              </Button>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4 border-t border-cyan-500/10 pt-4">
                              {expressionResult.steps.map((step, idx) => (
                                <div key={idx} className="flex flex-col gap-1 text-[9px] border-l border-cyan-500/20 pl-3">
                                  <span className="text-[#a0a5b8]/50 font-bold uppercase shrink-0">{step.title}</span>
                                  <span className="text-cyan-400/80 font-mono italic truncate">{step.content}</span>
                                </div>
                              ))}
                           </div>

                           <div className="pt-4 border-t border-cyan-500/10">
                              <CircuitSchematic 
                                sop={expressionResult.sop} 
                                variables={expressionResult.variables} 
                              />
                           </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card title="Digital Table Synthesis" icon={RefreshCw}>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Active Variables</label>
                        <select 
                          value={numVars} 
                          onChange={(e) => setNumVars(parseInt(e.target.value))}
                          className="w-full bg-[#0a0b10] border border-[#2d3142] p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value={2}>2-Variable (A, B)</option>
                          <option value={3}>3-Variable (A, B, C)</option>
                          <option value={4}>4-Variable (A, B, C, D)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase text-[#5e6684] font-mono font-bold tracking-wider">Interactive Bit-Vector [Y]</label>
                        <div className="flex flex-wrap gap-1 items-center px-3 py-2 bg-[#0a0b10] rounded border border-[#2d3142]">
                           {logicData.table.map((_, idx) => {
                             const vector = ttOutcome.split(',');
                             const val = vector[idx]?.trim() || "0";
                             return (
                               <div key={idx} className="flex flex-col items-center gap-1 group">
                                 <span className="text-[7px] text-[#5e6684] font-mono">m{idx}</span>
                                 <button 
                                   onClick={() => {
                                      const parts = vector.length === Math.pow(2, numVars) ? [...vector] : Array(Math.pow(2, numVars)).fill("0");
                                      parts[idx] = val === "1" ? "0" : "1";
                                      setTtOutcome(parts.join(','));
                                   }}
                                   id={`bit-toggle-${idx}`}
                                   className={cn(
                                      "w-7 h-9 flex items-center justify-center transition-all border rounded-sm text-[11px]",
                                      val === "1" ? "bg-cyan-500 border-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "bg-black/40 border-white/10 text-[#5e6684] hover:border-white/30"
                                   )}
                                 >
                                   {val}
                                 </button>
                               </div>
                             );
                           })}
                        </div>
                        <div className="bg-[#1a1c26] p-2 rounded text-[8px] text-[#5e6684]/60 italic flex justify-between uppercase">
                          <span>Auto-Indexing m₀ to m₁₅</span>
                          <span>{Math.pow(2, numVars)} States Total</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Boolean Logic Results" icon={Layers}>
                    <div className="space-y-3">
                       <div className="p-3 bg-[#0a0b10] border border-[#2d3142] rounded">
                          <div className="text-[9px] text-[#5e6684] uppercase font-bold mb-1">SOP Analysis (Min)</div>
                          <div className="font-mono text-xs text-cyan-400 italic break-all leading-relaxed">f = {logicData.sop}</div>
                       </div>
                       <div className="p-3 bg-[#0a0b10] border border-[#2d3142] rounded">
                          <div className="text-[9px] text-[#5e6684] uppercase font-bold mb-1">POS Analysis (Max)</div>
                          <div className="font-mono text-xs text-purple-400 italic break-all leading-relaxed">f = {logicData.pos}</div>
                       </div>
                    </div>
                  </Card>

                  <Card title="Karnaugh Optimization (K-Map)" icon={Layers}>
                    <div className="p-4 bg-[#0a0b10] border border-[#2d3142] rounded-lg">
                       <KMap table={logicData.table} variables={logicData.variables} />
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-7">
                  <Card title="Synthesized Truth Table" icon={Table}>
                    <div className="overflow-hidden border border-[#2d3142] rounded-lg">
                      <table className="w-full text-center text-[10px] font-mono border-collapse">
                        <thead>
                          <tr className="text-[#5e6684] bg-[#1a1c26] border-b border-[#2d3142]">
                            {Array.from({ length: numVars }).map((_, i) => (
                               <th key={i} className="p-3 font-bold uppercase tracking-widest">{String.fromCharCode(65 + i)}</th>
                            ))}
                            <th className="p-3 font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/5">f(Output)</th>
                          </tr>
                        </thead>
                        <tbody className="text-white">
                          {logicData.table.map((row, idx) => (
                            <tr key={idx} className="border-b border-[#1a1c26] hover:bg-white/5 transition-colors">
                              {row.inputs.map((val, i) => (
                                 <td key={i} className="p-3 opacity-60">{val}</td>
                              ))}
                              <td className={cn(
                                "p-3 font-bold", 
                                row.output === 1 ? "bg-cyan-900/20 text-cyan-400" : "text-[#2d3142]"
                              )}>
                                 {row.output}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'guide' && (
              <motion.div
                key="guide"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20"
              >
                <div className="space-y-6">
                  <Card title="Digital Logic Cheat Sheet" icon={BookOpen}>
                    <div className="space-y-6">
                        <p className="text-[10px] text-[#5e6684] uppercase font-black tracking-[0.2em] mb-4">Core Gate Synthesis</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-[#0a0b10] border border-[#2d3142] rounded-lg group hover:border-cyan-500/50 transition-colors">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                <h4 className="text-cyan-500 font-black text-[10px] uppercase">Boolean Operations</h4>
                              </div>
                              <div className="space-y-2 font-mono text-[9px] text-[#a0a5b8]">
                                <div className="flex justify-between"><span>AND (·)</span> <span className="text-white">Y = A & B</span></div>
                                <div className="flex justify-between"><span>OR (+)</span> <span className="text-white">Y = A | B</span></div>
                                <div className="flex justify-between"><span>NOT (‾)</span> <span className="text-white">Y = !A</span></div>
                                <div className="flex justify-between border-t border-[#2d3142] pt-2 mt-2"><span>XOR (⊕)</span> <span className="text-cyan-400">Y = A ^ B</span></div>
                                <div className="flex justify-between"><span>NAND</span> <span className="text-cyan-400">Y = !(A & B)</span></div>
                                <div className="flex justify-between"><span>NOR</span> <span className="text-cyan-400">Y = !(A | B)</span></div>
                                <div className="flex justify-between"><span>XNOR</span> <span className="text-cyan-400">Y = !(A ^ B)</span></div>
                              </div>
                          </div>
                          <div className="p-4 bg-[#0a0b10] border border-[#2d3142] rounded-lg group hover:border-amber-500/50 transition-colors shadow-[inset_0_0_10px_rgba(245,158,11,0.02)]">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <h4 className="text-amber-500 font-black text-[10px] uppercase">Binary Arithmetic</h4>
                              </div>
                              <div className="space-y-2 font-mono text-[9px] text-[#a0a5b8]">
                                <div className="flex justify-between"><span>1 + 1</span> <span className="text-white">10 (C:1, S:0)</span></div>
                                <div className="flex justify-between"><span>1 + 0</span> <span className="text-white">1</span></div>
                                <div className="flex justify-between"><span>0 + 0</span> <span className="text-white">0</span></div>
                                <div className="flex flex-col gap-1 border-t border-[#2d3142] pt-2 mt-2">
                                  <span className="text-[8px] text-amber-500/50">SIGNED SYSTEMS</span>
                                  <div className="flex justify-between italic"><span>Sub A-B</span> <span>A + (B' + 1)</span></div>
                                  <div className="flex justify-between italic"><span>OF Flag</span> <span>C_in ⊕ C_out</span></div>
                                </div>
                              </div>
                          </div>
                        </div>

                        <div className="p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                             <Cpu size={60} className="text-cyan-500" />
                          </div>
                          <h4 className="text-cyan-400 font-black text-[11px] mb-4 uppercase tracking-[0.15em] flex items-center gap-2">
                             <ShieldCheck size={12} />
                             Hardware Identity Laws
                          </h4>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3 font-mono text-[9px]">
                              <div className="flex justify-between items-center group/item">
                                <span className="text-[#5e6684] group-hover/item:text-cyan-500 transition-colors">Identity:</span> 
                                <span className="text-white">A + 0 = A</span>
                              </div>
                              <div className="flex justify-between items-center group/item">
                                <span className="text-[#5e6684] group-hover/item:text-cyan-500 transition-colors">Idempotent:</span> 
                                <span className="text-white">A + A = A</span>
                              </div>
                              <div className="flex justify-between items-center group/item">
                                <span className="text-[#5e6684] group-hover/item:text-cyan-500 transition-colors">Null:</span> 
                                <span className="text-white">A · 1 = A</span>
                              </div>
                              <div className="flex justify-between items-center group/item">
                                <span className="text-[#5e6684] group-hover/item:text-cyan-500 transition-colors">Universal:</span> 
                                <span className="text-white">A + 1 = 1</span>
                              </div>
                              <div className="flex justify-between items-center group/item">
                                <span className="text-[#5e6684] group-hover/item:text-cyan-500 transition-colors">Complement:</span> 
                                <span className="text-white">A · !A = 0</span>
                              </div>
                              <div className="flex justify-between items-center group/item">
                                <span className="text-[#5e6684] group-hover/item:text-cyan-500 transition-colors">Absorb:</span> 
                                <span className="text-white">A(A+B) = A</span>
                              </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-cyan-500/10 flex justify-center">
                             <div className="bg-black/50 px-4 py-2 border border-cyan-500/30 rounded text-[10px] font-black text-cyan-400 italic">
                                De Morgan: !(A+B) ≡ !A · !B | !(A·B) ≡ !A + !B
                             </div>
                          </div>
                        </div>
                    </div>
                  </Card>

                  <Card title="Signal State Indicators" icon={Activity}>
                     <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                           {[
                             { label: 'HIGH', logic: '1', color: 'bg-cyan-500', desc: 'VCC (+5V)' },
                             { label: 'LOW', logic: '0', color: 'bg-[#1a1c26]', desc: 'GND (0V)' },
                             { label: 'HIGH-Z', logic: 'Z', color: 'bg-amber-500/40', desc: 'Floating' },
                             { label: 'ERR', logic: 'U', color: 'bg-red-500/40', desc: 'Undefined' },
                           ].map((state) => (
                             <div key={state.label} className="p-3 bg-[#0a0b10] border border-[#2d3142] rounded-lg text-center flex flex-col items-center gap-1 group hover:border-white/20 transition-all">
                                <div className={cn("w-1.5 h-1.5 rounded-full mb-1", state.color)} />
                                <span className="text-[9px] font-black text-white">{state.label}</span>
                                <span className="text-[7px] text-[#5e6684] uppercase">{state.desc}</span>
                             </div>
                           ))}
                        </div>
                     </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card title="Lab Technical Reference" icon={BookOpen}>
                     <div className="space-y-8">
                        <div className="space-y-4">
                           <h4 className="text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-2">
                              <Layers size={12} className="text-cyan-500" />
                              System Architecture Segments
                           </h4>
                           <div className="space-y-4">
                              <div className="p-4 bg-black/40 border border-[#2d3142] rounded-lg group">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-black text-white uppercase italic">Combinational Systems</span>
                                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[7px] text-green-500 font-black">STABLE_V4</span>
                                 </div>
                                 <p className="text-[10px] text-[#a0a5b8] leading-relaxed">
                                    Output is purely a functional mapping of current inputs. No memory or internal state storage. Optimized via Karnaugh Maps and Boolean minimisation.
                                 </p>
                              </div>

                              <div className="p-4 bg-black/40 border border-[#2d3142] rounded-lg group shadow-[inset_0_0_15px_rgba(6,182,212,0.02)]">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-black text-white uppercase italic">Sequential Logic [MEMORY]</span>
                                    <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[7px] text-cyan-400 font-black">LATENCY: LOW</span>
                                 </div>
                                 <p className="text-[10px] text-[#a0a5b8] leading-relaxed">
                                    Output depends on current inputs AND previous states. Encompasses SR-Latches, Flip-Flops, and Ring Counters. Clocked synchronous operations are the backbone of modern CPU architectures.
                                 </p>
                                 <div className="mt-4 grid grid-cols-2 gap-3 text-[8px] font-mono">
                                    <div className="p-2 border border-white/5 bg-[#0a0b10] rounded text-cyan-500/60">FLIP_FLOP: Edge Triggered</div>
                                    <div className="p-2 border border-white/5 bg-[#0a0b10] rounded text-cyan-500/60">LATCH: Level Sensitive</div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-5">
                           <h4 className="text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-2">
                              <Cpu size={12} className="text-amber-500" />
                              Floating Point Engineering
                           </h4>
                           <div className="bg-[#0a0b10] border border-amber-500/20 p-5 rounded-xl">
                              <div className="flex items-center gap-4 mb-5">
                                 <div className="flex-1 h-1 bg-[#1a1c26] rounded-full overflow-hidden">
                                    <div className="h-full w-[25%] bg-amber-500" />
                                 </div>
                                 <div className="flex-1 h-1 bg-[#1a1c26] rounded-full overflow-hidden">
                                    <div className="h-full w-[50%] bg-cyan-500" />
                                 </div>
                                 <div className="flex-1 h-1 bg-[#1a1c26] rounded-full overflow-hidden">
                                    <div className="h-full w-[75%] bg-purple-500" />
                                 </div>
                              </div>
                              <div className="space-y-3">
                                 <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-xs">S</div>
                                    <div className="flex-1">
                                       <span className="text-[9px] font-black text-white block">SIGN BIT [1-BIT]</span>
                                       <span className="text-[8px] text-[#5e6684]">0 for Positive (+) | 1 for Negative (-)</span>
                                    </div>
                                 </div>
                                 <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs">E</div>
                                    <div className="flex-1">
                                       <span className="text-[9px] font-black text-white block">EXPONENT [8-BIT]</span>
                                       <span className="text-[8px] text-[#5e6684]">Biased notation (E = e + 127) determines range scale.</span>
                                    </div>
                                 </div>
                                 <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-xs">M</div>
                                    <div className="flex-1">
                                       <span className="text-[9px] font-black text-white block">MANTISSA [23-BIT]</span>
                                       <span className="text-[8px] text-[#5e6684]">Normalized fractional magnitude precision.</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                         <div className="space-y-4 pt-4 border-t border-white/5">
                           <h4 className="text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-2">
                              <Zap size={12} className="text-purple-500" />
                              Advanced Design Protocols
                           </h4>
                           <div className="grid grid-cols-1 gap-4">
                              <div className="p-4 bg-[#0a0b10] border border-purple-500/20 rounded-lg group">
                                 <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                                    <span className="text-[9px] font-black text-white uppercase italic">Finite State Machines (FSM)</span>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                       <span className="text-[8px] text-purple-400 font-bold uppercase">Mealy Machine</span>
                                       <p className="text-[9px] text-[#5e6684] leading-tight">Output depends on both current state and inputs.</p>
                                    </div>
                                    <div className="space-y-2 border-l border-white/5 pl-4">
                                       <span className="text-[8px] text-purple-400 font-bold uppercase">Moore Machine</span>
                                       <p className="text-[9px] text-[#5e6684] leading-tight">Output depends ONLY on the current state.</p>
                                    </div>
                                 </div>
                              </div>

                              <div className="p-4 bg-[#0a0b10] border border-cyan-500/20 rounded-lg group">
                                 <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
                                    <span className="text-[9px] font-black text-white uppercase italic">Logic Families: TTL vs CMOS</span>
                                 </div>
                                 <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                                       <span className="text-[9px] text-white font-bold">TTL (Transistor-Transistor)</span>
                                       <span className="text-[8px] text-cyan-400 uppercase">Fast Operation</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                                       <span className="text-[9px] text-white font-bold">CMOS (Comp. Metal-Oxide)</span>
                                       <span className="text-[8px] text-purple-400 uppercase">Low Power Drain</span>
                                    </div>
                                    <div className="pt-2 text-[7px] text-[#5e6684] italic uppercase text-center">
                                       Modern CPU architectures predominantly utilize high-density CMOS.
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-5 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden group">
                           <div className="absolute -bottom-8 -right-8 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                              <Cpu size={120} />
                           </div>
                           <div className="relative z-10 space-y-4">
                              <div className="flex items-center gap-2">
                                 <div className="p-1.5 bg-white/10 rounded-lg">
                                    <RefreshCw size={14} className="text-white animate-spin-slow" />
                                 </div>
                                 <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Engineering Roadmap</h4>
                              </div>
                              <div className="space-y-2">
                                 {[
                                   { step: '01', title: 'Logic Synthesis', desc: 'Boolean Equation Extraction' },
                                   { step: '02', title: 'Minimisation', desc: 'Quine-McCluskey Reduction' },
                                   { step: '03', title: 'Physical Mapping', desc: 'Gate Primitive Selection' },
                                   { step: '04', title: 'Timing Analysis', desc: 'Propagation Delay Verification' },
                                 ].map((item, i) => (
                                   <div key={i} className="flex items-center gap-4 bg-black/40 p-2 rounded-lg border border-white/5 group/row hover:border-cyan-500/30 transition-all">
                                      <span className="text-[10px] font-black text-cyan-500/50 group-hover/row:text-cyan-400 transition-colors">{item.step}</span>
                                      <div className="flex-1">
                                         <span className="text-[9px] font-black text-white block uppercase">{item.title}</span>
                                         <span className="text-[8px] text-[#5e6684] tracking-tight">{item.desc}</span>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div className="pt-4 border-t border-[#2d3142] flex justify-between items-center">
                           <div className="flex items-center gap-3">
                              <Cpu size={14} className="text-cyan-500 animate-pulse" />
                              <div className="text-[8px] font-mono text-[#5e6684] uppercase">
                                 System_Kernel_Docs: v4.1.0 <br/>
                                 Last_Auth_Audit: 2026_MAY
                              </div>
                           </div>
                           <button 
                             onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                             className="p-2 border border-[#2d3142] rounded hover:bg-white/5 transition-colors"
                           >
                             <ArrowUp size={12} className="text-[#5e6684]" />
                           </button>
                        </div>
                     </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'data-hub' && (
              <motion.div
                key="data-hub"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="grid grid-cols-1 gap-6 pb-20"
              >
                 <Card title="System Reference: Binary Data Hub (Adaptive Architecture)" icon={Table}>
                      <div className="space-y-4">
                         <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-black/40 p-5 rounded-lg border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                            <div className="flex gap-10 items-center flex-1">
                               <div className="space-y-1">
                                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                     <Activity size={12} className="text-cyan-500" />
                                     Universal Dictionary
                                  </h3>
                                  <p className="text-[9px] text-[#5e6684] font-mono tracking-tighter">Target Segment: 0-511 | Hardware Width: {refWidth}-BIT</p>
                               </div>
                               
                               <div className="flex flex-col gap-1.5">
                                  <label className="text-[7px] text-cyan-500 opacity-50 font-black uppercase tracking-widest">Bus Width Select</label>
                                  <div className="flex gap-1 bg-[#0a0b10] p-1 rounded-sm border border-[#2d3142]">
                                     {[1, 4, 8, 9, 12, 16, 24, 32].map(w => (
                                       <button
                                         key={w}
                                         onClick={() => setRefWidth(w)}
                                         className={cn(
                                           "px-2.5 py-1 text-[8px] font-black rounded-sm transition-all",
                                           refWidth === w 
                                             ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)]" 
                                             : "text-[#5e6684] hover:text-white hover:bg-white/5"
                                         )}
                                       >
                                         {w}B
                                       </button>
                                     ))}
                                  </div>
                               </div>
                            </div>

                            <div className="relative w-full md:w-80 group">
                               <input 
                                 type="text"
                                 placeholder="ADDR_BUS_LOOKUP..."
                                 value={refSearch}
                                 onChange={(e) => setRefSearch(e.target.value.toUpperCase())}
                                 className="w-full bg-[#0a0b10] border border-[#2d3142] rounded-md px-12 py-3 text-[10px] font-mono text-cyan-400 focus:border-cyan-500 focus:outline-none transition-all placeholder:opacity-20 group-hover:border-cyan-500/30"
                               />
                               <Binary size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/40 group-focus-within:text-cyan-500 transition-colors" />
                               <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5e6684]/40" />
                            </div>
                         </div>

                         <div className="overflow-hidden border border-[#2d3142]/50 rounded-xl bg-[#0a0b10] shadow-2xl">
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                               <table className="w-full text-left font-mono text-[10px]">
                                  <thead className="bg-[#13151f] text-[#5e6684] border-b border-[#2d3142] uppercase font-black sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
                                     <tr className="bg-[#13151f] text-[#5e6684] border-b border-[#2d3142] uppercase font-black sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
                                        <th className="px-6 py-5">DEC</th>
                                        <th className="px-6 py-5">BINARY ({refWidth}-BIT)</th>
                                        <th className="px-6 py-5">GRAY</th>
                                        <th className="px-6 py-5">BCD</th>
                                        <th className="px-6 py-5">X3</th>
                                        <th className="px-6 py-5">HEX</th>
                                        <th className="px-6 py-5">2's COMP</th>
                                        <th className="px-6 py-5">SYM</th>
                                        <th className="px-6 py-5">PARITY</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                      {filteredRefData.map((row) => {
                                         const bits = row.bin.split('');
                                         const highCount = bits.filter(b => b === '1').length;
                                         const grayCode = decToGray(row.dec, refWidth);
                                         const bcd = decToBCD(row.dec);
                                         const x3 = decToExcess3(row.dec);
                                         const signedVal = getSignedInfo(row.bin, refWidth).twosComplement;
                                         return (
                                           <tr key={row.dec} className="border-b border-[#2d3142]/20 hover:bg-cyan-500/5 transition-all group cursor-default">
                                              <td className="px-6 py-4 font-black text-white/90 group-hover:text-white">{row.dec}</td>
                                              <td className="px-6 py-4 text-cyan-400/80 group-hover:text-cyan-400 tracking-[0.25em] font-medium leading-none">
                                                 {row.bin}
                                              </td>
                                              <td className="px-6 py-4 text-purple-400 opacity-60 font-medium">{grayCode}</td>
                                              <td className="px-6 py-4 text-emerald-500/50 font-mono tracking-tighter">{bcd}</td>
                                              <td className="px-6 py-4 text-orange-400/50 font-mono tracking-tighter">{x3}</td>
                                              <td className="px-6 py-4 text-amber-500/70 group-hover:text-amber-500 font-bold">0x{row.hex}</td>
                                              <td className={cn(
                                                "px-6 py-4 font-bold",
                                                signedVal < 0 ? "text-red-400/60" : "text-green-400/60"
                                              )}>{signedVal}</td>
                                              <td className="px-6 py-4">
                                                 <span className={cn(
                                                   "px-3 py-1 rounded-sm text-[8px] font-black tracking-widest shadow-sm",
                                                   row.char === 'CTRL' || row.char === 'EXT' 
                                                     ? "bg-[#1a1c26] text-[#5e6684] border border-white/5" 
                                                     : "bg-cyan-500/10 text-cyan-100 border border-cyan-500/30"
                                                 )}>
                                                   {row.char}
                                                 </span>
                                              </td>
                                              <td className="px-6 py-4">
                                                 <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                      "w-2 h-2 rounded-full",
                                                      highCount % 2 === 0 ? "bg-blue-500/40" : "bg-orange-500/40"
                                                    )} />
                                                    <span className="text-[8px] font-black uppercase text-[#5e6684] opacity-50">
                                                       {highCount % 2 === 0 ? 'EVEN' : 'ODD'}
                                                    </span>
                                                 </div>
                                              </td>
                                           </tr>
                                         );
                                      })}
                                   </tbody>
                               </table>
                            </div>
                         </div>
                         
                         <div className="flex justify-between items-center bg-[#0a0b10] p-4 border border-[#2d3142] rounded-lg mt-4 text-[9px] font-mono">
                            <div className="flex gap-6">
                               <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500/40" />
                                  <span className="text-[#5e6684] uppercase font-bold">Even Parity</span>
                               </div>
                               <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500/40" />
                                  <span className="text-[#5e6684] uppercase font-bold">Odd Parity</span>
                               </div>
                            </div>
                            <div className="text-[#5e6684] flex items-center gap-2">
                               <Cpu size={10} className="text-cyan-500" />
                               <span className="uppercase font-black">Architecture Segment: System_Default_Map</span>
                            </div>
                         </div>
                      </div>
                   </Card>
              </motion.div>
            )}

            {activeTab === 'visuals' && (
              <motion.div
                key="visuals"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 overflow-y-auto"
              >
                <div className="lg:col-span-12">
                   <Card title="Hardware Signal Intelligence" icon={Signal}>
                      <div className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#0a0b10] border border-[#2d3142] p-5 rounded-lg relative overflow-hidden group">
                               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <Zap size={40} className="text-cyan-500" />
                               </div>
                               <div className="text-[8px] text-[#5e6684] uppercase font-black mb-1">Signal Density</div>
                               <div className="text-2xl font-mono text-white mb-4">{(arithResult?.binary.split('1').length - 1 || 0) / (arithResult?.binary.length || 1) * 100}%</div>
                               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(arithResult?.binary.split('1').length - 1 || 0) / (arithResult?.binary.length || 1) * 100}%` }}
                                    className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                                  />
                               </div>
                            </div>
                            
                            <div className="bg-[#0a0b10] border border-[#2d3142] p-5 rounded-lg relative overflow-hidden group">
                               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <Activity size={40} className="text-amber-500" />
                               </div>
                               <div className="text-[8px] text-[#5e6684] uppercase font-black mb-1">Architecture Latency</div>
                               <div className="text-2xl font-mono text-white mb-4">{(arithResult?.steps.length || 0) * 1.2}ns</div>
                               <div className="flex gap-1 h-1.5 items-end">
                                  {Array.from({ length: 12 }).map((_, i) => (
                                    <div 
                                      key={i} 
                                      className="flex-1 bg-amber-500/20 rounded-t-sm animate-pulse" 
                                      style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 100}ms` }} 
                                    />
                                  ))}
                                </div>
                            </div>

                            <div className="bg-[#0a0b10] border border-[#2d3142] p-5 rounded-lg relative overflow-hidden group">
                               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <Maximize2 size={40} className="text-purple-500" />
                               </div>
                               <div className="text-[8px] text-[#5e6684] uppercase font-black mb-1">Register Utilization</div>
                               <div className="text-2xl font-mono text-white mb-4">{Math.round((bitWidth / 64) * 100)}%</div>
                               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(bitWidth / 64) * 100}%` }}
                                    className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                                  />
                               </div>
                            </div>
                         </div>
                      </div>
                   </Card>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  <Card title="Signal Logic Traces (Waveforms)" icon={RefreshCw}>
                    <div className="space-y-4">
                      {['A', 'B', 'f(Output)'].map((label, idx) => (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-bold font-mono text-[#5e6684] uppercase tracking-widest">{label} SIGNAL</span>
                            <span className="text-[8px] text-cyan-500/40 font-mono uppercase">Status: OK // CLOCK: 1.2Hz</span>
                          </div>
                          <div className="h-16 bg-[#0a0b10] border border-[#2d3142] rounded-sm relative overflow-hidden group">
                           {/* SVG Waveform Simulation */}
                           <svg viewBox="0 0 400 64" className="w-full h-full">
                              <path 
                                d={idx === 2 
                                  ? "M0 48 L50 48 L50 16 L150 16 L150 48 L300 48 L300 16 L400 16" 
                                  : (idx === 0 ? "M0 48 L100 48 L100 16 L200 16 L200 48 L350 48 L350 16 L400 16" : "M0 16 L80 16 L80 48 L180 48 L180 16 L280 16 L280 48 L400 48")
                                }
                                fill="none"
                                stroke={idx === 2 ? "#06b6d4" : "#2d3142"}
                                strokeWidth="2"
                                className={cn("transition-all duration-1000", idx === 2 && "animate-pulse")}
                              />
                           </svg>
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Signal Bit Heatmap" icon={Activity}>
                    <div className="space-y-4">
                       <div className="grid grid-cols-8 gap-2">
                          {(arithResult?.binary || "").split('').map((bit, i) => (
                            <div key={i} className={cn(
                              "h-10 border rounded flex items-center justify-center transition-all group relative",
                              bit === '1' ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400" : "bg-black/20 border-[#2d3142] text-[#5e6684]/30"
                            )}>
                               <span className="text-[10px] font-mono font-black">{bit}</span>
                               <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                       </div>
                       <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-lg flex justify-between items-center">
                          <div className="space-y-1">
                             <div className="text-[8px] text-[#5e6684] uppercase font-bold">Bit Stream Density</div>
                             {(() => {
                               const binary = arithResult?.binary || "0";
                               const highCount = binary.split('1').length - 1;
                               const density = (highCount / (binary.length || 1)) * 100;
                               return (
                                 <>
                                   <div className="text-sm font-mono text-white">{density.toFixed(1)}% HIGH</div>
                                   <div className="w-32 h-1 bg-[#0a0b10] rounded-full overflow-hidden absolute right-3 top-1/2 -translate-y-1/2">
                                     <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${density}%` }} />
                                   </div>
                                 </>
                               );
                             })()}
                          </div>
                       </div>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <Card title="Bit-Line Impact Factor" icon={BarChart3}>
                    <div className="h-[280px] w-full mt-4 bg-[#0a0b10] border border-[#2d3142] rounded-lg p-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={
                        Array.from({ length: numVars }).map((_, i) => {
                          const impacts = logicData.table.filter(row => row.inputs[i] === 1 && row.output === 1).length;
                          return { name: `${String.fromCharCode(65 + i)}`, impact: impacts };
                        })
                      }>
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" fontSize={9} axisLine={false} tickLine={false} stroke="#5e6684" />
                         <Tooltip 
                           contentStyle={{ backgroundColor: '#12141d', border: '1px solid #2d3142', borderRadius: '4px', fontSize: '10px' }} 
                         />
                         <Bar dataKey="impact" radius={[0, 2, 2, 0]} barSize={20}>
                           {Array.from({ length: numVars }).map((_, index) => (
                             <Cell key={index} fill={index === 0 ? "#06b6d4" : "#1a1c26"} stroke={index === 0 ? "#22d3ee" : "#2d3142"} />
                           ))}
                         </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                
                <Card title="Hamming Entropy Diagnostics" icon={ShieldCheck}>
                   <div className="space-y-4">
                      <div className="p-4 bg-[#0a0b10] border border-[#2d3142] rounded flex flex-col gap-3">
                         <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#5e6684] uppercase font-bold">Signal Coherence</span>
                            <span className="text-green-500 font-mono">99.2%</span>
                         </div>
                         <div className="w-full h-1 bg-[#1a1c26] rounded-full">
                            <div className="w-[99%] h-full bg-green-500" />
                         </div>
                      </div>
                      <p className="text-[8px] text-[#5e6684] uppercase tracking-widest text-center leading-relaxed">
                        Data parity preserved across simulated transmission mediums.
                      </p>
                   </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>

      {/* Footer Bar */}
      <footer className="h-8 bg-[#0e1017] border-t border-[#2d3142] flex items-center justify-between px-4 shrink-0 font-mono text-[9px] tracking-tight overflow-hidden">
        <div className="flex gap-4">
          <span className="text-white">ALGORITHM: <span className="text-cyan-500 uppercase">{op === 'add' ? 'BIN_ADD_STD' : 'TWO_COMP_SUB'}</span></span>
          <span className="text-[#2d3142]">|</span>
          <span className="text-[#a0a5b8]/60 uppercase">System_Clock: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-1.5 uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-white">Secure Session: <span className="text-cyan-500">BD-42-X0</span></span>
          </div>
          <span className="text-white opacity-20 uppercase tracking-widest hidden md:inline">© 2026 LAB_SYS_PRO</span>
        </div>
      </footer>
    </div>
  );
}
