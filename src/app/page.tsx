import Link from "next/link";
import { tools } from "../config/tools";
import { 
  Sparkles, 
  ShieldCheck,
  Zap,
  Calculator
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-primary/30">
      {/* Top Navigation */}
      <header className="px-6 md:px-12 flex items-center justify-between mb-24 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center transform hover:rotate-12 transition-transform shadow-lg shadow-indigo-500/20">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">FileOmni</span>
        </div>
        
        <nav className="hidden md:block">
          <div className="flex items-center gap-8">
            <div className="relative group inline-block z-[999]">
              <button className="text-sm font-medium text-gray-300 hover:text-white transition-colors py-2">Tools ▾</button>
              <div className="absolute left-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col overflow-hidden">
                {tools.map((tool) => (
                  <Link 
                    key={tool.id} 
                    href={tool.href} 
                    className="px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center gap-2"
                  >
                    <span>{tool.icon}</span> {tool.name}
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/privacy" className="text-sm font-medium text-gray-300 hover:text-white transition-colors py-2">Privacy</Link>
          </div>
        </nav>

        <div className="hidden md:flex relative group inline-block z-[999]">
          <button className="text-gray-300 hover:text-white py-2 text-2xl leading-none">☰</button>
          <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-5 text-left cursor-default">
            <h4 className="text-white font-medium mb-2 text-sm">About FileOmni</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              FileOmni is a privacy-first utility suite. All media processing, AI background removal, and document conversions run entirely locally on your machine via WebAssembly. 
              <br/><br/>
              Zero files or personal data are ever uploaded, analyzed, or stored on external servers.
            </p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 flex flex-col items-center">
        
        <div className="px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-medium text-indigo-300 mb-8 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          A LOCAL-FIRST PRODUCTIVITY SUITE
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-center mb-6 leading-[1.1] tracking-tight">
          Privacy-First <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Universal</span><br />
          <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Tools</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 text-center max-w-2xl mb-24 leading-relaxed">
          Scan, convert, extract, and calculate. One secure interface for all your daily tasks, running entirely on your machine.
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mb-32">
          
          {/* Highlighted Smart Scanner Card */}
          <Link
            href="/tools/smart-scanner"
            className="md:col-span-2 lg:col-span-3 flex flex-col gap-6 p-8 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/30 rounded-2xl hover:border-indigo-500/60 hover:bg-indigo-500/10 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-indigo-500/5"
          >
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <Sparkles className="w-64 h-64" />
            </div>
            
            <div className="relative z-10 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">📄</div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">Perspective Scanner</h3>
              </div>
              
              <p className="text-gray-200 leading-relaxed text-base md:text-lg mb-6">
                Transform physical documents into perfect digital PDFs instantly. Upload an existing photo or use your laptop/mobile camera to capture documents live. Use our manual precision crop tool to mathematically flatten crooked pages directly on your machine for maximum privacy.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4">
                 <div className="flex-1 bg-black/40 p-5 rounded-xl border border-white/5 shadow-inner">
                    <strong className="text-indigo-400 block mb-2 text-xs uppercase tracking-widest font-bold">Live Capture & Upload</strong>
                    <span className="text-sm text-gray-400 leading-relaxed">Instantly snap photos using your built-in camera or drag-and-drop existing images into our secure, offline pipeline.</span>
                 </div>
                 <div className="flex-[2] bg-black/40 p-5 rounded-xl border border-white/5 shadow-inner">
                    <strong className="text-purple-400 block mb-2 text-xs uppercase tracking-widest font-bold">Precision Warp</strong>
                    <span className="text-sm text-gray-400 leading-relaxed">Manually trace the four corners of your document to mathematically flatten crooked pages and apply professional high-contrast B&W filters.</span>
                 </div>
              </div>
            </div>
          </Link>

          {/* Standard Tool Grid */}
          {tools.filter(t => t.id !== 'smart-scanner').map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="flex flex-col p-6 bg-[#121214] border border-white/5 rounded-2xl hover:border-indigo-500 hover:bg-[#18181A] transition-all duration-200 group"
            >
              <div className="text-2xl mb-4 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">{tool.icon}</div>
              <h3 className="text-lg font-bold text-white mb-1 tracking-tight">{tool.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{tool.description}</p>
            </Link>
          ))}
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full pt-12 border-t border-white/5">
          <ValueProp 
            icon={<ShieldCheck className="text-blue-400" />}
            title="Absolute Privacy"
            desc="Files stay in your browser. Total data sovereignty."
          />
          <ValueProp 
            icon={<Zap className="text-purple-400" />}
            title="Zero Latency"
            desc="No upload delays. No server queues. Just speed."
          />
          <ValueProp 
            icon={<Calculator className="text-emerald-400" />}
            title="Always Free"
            desc="Local processing means zero server overhead for us."
          />
        </div>

      </main>

      <footer className="mt-24 text-center text-sm text-gray-600">
        © 2026 FileOmni Local-First Utilities. Built for the privacy-conscious web.
      </footer>
    </div>
  );
}



function ValueProp({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <h4 className="text-xl font-bold tracking-tight">{title}</h4>
      <p className="text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
