import React from 'react';
import { DemoPlayer } from '@/components/remotion/demo-player';
import Link from 'next/link';

export const metadata = {
  title: 'Remotion Studio | Akubrecah KRA Portal',
  description: 'Design and preview programmatic video layouts in real time.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RemotionDemoPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Header */}
      <header className="z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-xs bg-primary" />
            <h1 className="text-xl font-black tracking-tight uppercase">
              REMOTION <span className="text-slate-400 font-normal">STUDIO</span>
            </h1>
          </div>
          <Link
            href="/"
            className="text-xs font-mono text-slate-300 hover:text-white border border-slate-700 hover:border-white px-3 py-1.5 rounded-lg transition-colors uppercase"
          >
            &larr; Back to Portal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="z-10 flex-grow py-12 px-6 flex flex-col justify-center items-center">
        <div className="max-w-6xl w-full text-center mb-12">
          <span className="text-xs font-mono tracking-widest text-primary uppercase bg-primary/15 px-3 py-1 rounded-full border border-primary/30 inline-block mb-4">
            Interactive Studio Preview
          </span>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 max-w-2xl mx-auto">
            Programmatic Video Rendering
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">
            Create high-fidelity video templates in React and preview changes instantly with smooth frame-by-frame scrubbing.
          </p>
        </div>

        <DemoPlayer />
      </div>

      {/* Footer */}
      <footer className="z-10 border-t border-slate-900 py-6 px-6 text-center text-xs font-mono text-slate-500">
        AKUBRECAH ENTERTAINMENT // REMOTION SDK INTEGRATION
      </footer>
    </div>
  );
}
