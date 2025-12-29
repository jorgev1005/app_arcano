import Link from 'next/link';
import { ArrowRight, Lock, Layout, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Arcano
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full transition-all">
            Registrarse
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 mt-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-300 mb-6 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          v2.0 Disponible Ahora
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          Escribe el Futuro.
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
          La herramienta definitiva para autores de ciencia ficción.
          Organiza, visualiza y crea con una interfaz inspirada en el próximo iOS.
        </p>

        <Link href="/register" className="group relative inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]">
          Comenzar Gratis
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-6xl w-full px-4">
          <FeatureCard
            icon={<Layout className="w-6 h-6 text-blue-400" />}
            title="Binder Visual"
            description="Organiza capítulos, personajes y lugares con arrastrar y soltar."
          />
          <FeatureCard
            icon={<Smartphone className="w-6 h-6 text-purple-400" />}
            title="Mobile First"
            description="Una experiencia fluida en tu teléfono, igual que una app nativa."
          />
          <FeatureCard
            icon={<Lock className="w-6 h-6 text-green-400" />}
            title="Seguro & Privado"
            description="Tus manuscritos están encriptados y protegidos."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors text-left">
      <div className="mb-4 p-3 bg-white/5 rounded-xl inline-block">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}