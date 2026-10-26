import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  isExecuting: boolean;
  currentLine: number;
  placeholder: string;
  error: string | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, isExecuting, currentLine, placeholder, error }) => {
  const lines = code.split('\n');

  return (
    <div className="flex flex-col h-full bg-brand-navy rounded-xl overflow-hidden shadow-xl border border-white/10">
      <div className="flex items-center gap-2 px-4 py-2 bg-brand-navy border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-xs font-mono text-brand-ice/50 ml-2 uppercase tracking-widest">editor.js</span>
      </div>
      
      <div className="relative flex-1 flex font-mono text-sm leading-6 overflow-hidden">
        {/* Line Numbers */}
        <div className="w-10 bg-brand-navy/50 text-brand-ice/75 text-right pr-3 select-none py-4 border-right border-white/10">
          {lines.map((_, i) => {
            const isActive = isExecuting && currentLine === i;
            const isError = !!error && currentLine === i;
            
            return (
              <motion.div 
                key={i} 
                animate={{ 
                  scale: isActive || isError ? 1.25 : 1,
                  color: isError ? '#f87171' : (isActive ? '#60a5fa' : '#475569'),
                  x: isActive || isError ? 2 : 0
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`h-6 text-[10px] font-bold flex items-center justify-end gap-1`}
              >
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Play className="w-2 h-2 fill-brand-cyan text-brand-cyan" />
                  </motion.div>
                )}
                {i + 1}
              </motion.div>
            );
          })}
        </div>

        {/* Textarea */}
        <div className="relative flex-1">
          {/* Somente leitura: o código é construído apenas com os botões de comando. */}
          <div
            role="textbox"
            aria-readonly="true"
            aria-label="editor.js"
            className="absolute inset-0 text-brand-ice/85 p-4 whitespace-pre overflow-hidden select-none z-20"
          >
            {code === '' ? (
              <span className="text-brand-ice/40">{placeholder}</span>
            ) : (
              code
            )}
          </div>
          {/* Active Line Text Highlight */}
          {isExecuting && currentLine < lines.length && (
            <div 
              className="absolute left-0 right-0 pointer-events-none z-10"
              style={{ 
                top: `${currentLine * 24 + 16}px`,
                height: '24px'
              }}
            >
              <div className="h-full w-full bg-brand-blue/5 blur-sm" />
            </div>
          )}
        </div>

        {/* Execution Highlight */}
        <AnimatePresence mode="popLayout">
          {isExecuting && currentLine < lines.length && (
            <motion.div 
              key={`exec-${currentLine}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-10 right-0 bg-brand-blue/15 border-l-2 border-brand-blue pointer-events-none z-10"
              style={{ 
                top: `${currentLine * 24 + 16}px`,
                height: '24px'
              }}
            >
              {/* Subtle continuous pulse */}
              <motion.div 
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-brand-blue/10"
              />
              {/* Brief flash on enter */}
              <motion.div 
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 bg-brand-cyan/40"
              />
              {/* Scan line effect */}
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 0.5, ease: "linear" }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Highlight */}
        {error && currentLine < lines.length && (
          <div 
            className="absolute left-10 right-0 bg-red-500/10 border-y border-red-500/40 pointer-events-none"
            style={{ 
              top: `${currentLine * 24 + 16}px`,
              height: '24px'
            }}
          >
            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
              <div className="w-1.5 h-1.5 bg-brand-navy rounded-full animate-pulse" />
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
