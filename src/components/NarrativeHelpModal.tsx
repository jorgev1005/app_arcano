
import { X, BookOpen, Activity, Zap, Heart, Brain } from 'lucide-react';

interface NarrativeHelpModalProps {
    onClose: () => void;
}

export default function NarrativeHelpModal({ onClose }: NarrativeHelpModalProps) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-white/20 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <BookOpen size={24} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Guía del Motor Narrativo</h2>
                            <p className="text-xs text-gray-400">Conceptos y Metodología</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors hover:bg-white/10 p-2 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto leading-relaxed text-gray-300 space-y-8">

                    {/* Intro */}
                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg">
                        <p className="text-sm">
                            El <strong>Motor Narrativo Arcano</strong> analiza tu historia basándose en tres métricas universales.
                            A diferencia del conteo de palabras simple, estas métricas cuantifican el <em>peso emocional</em> y la <em>intensidad</em> de cada escena.
                        </p>
                    </div>

                    {/* Metrics */}
                    <section>
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-green-400" /> Las 3 Métricas Clave
                        </h3>
                        <div className="grid gap-4">
                            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                <div className="flex justify-between mb-2">
                                    <strong className="text-white">1. Foco (Focus)</strong>
                                    <span className="text-xs uppercase bg-white/10 px-2 rounded text-gray-400">Escala 0-10</span>
                                </div>
                                <p className="text-sm mb-2">Mide hacia dónde se dirige la atención de la escena.</p>
                                <div className="flex justify-between text-xs text-gray-500 font-mono bg-black/30 p-2 rounded">
                                    <span>0 = Introspección Pura</span>
                                    <span>10 = Acción Externa Pura</span>
                                </div>
                            </div>

                            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                <div className="flex justify-between mb-2">
                                    <strong className="text-white">2. Disonancia (Dissonance)</strong>
                                    <span className="text-xs uppercase bg-white/10 px-2 rounded text-gray-400">Escala 1-10</span>
                                </div>
                                <p className="text-sm mb-2">Mide el nivel de conflicto, caos o tensión no resuelta.</p>
                                <div className="flex justify-between text-xs text-gray-500 font-mono bg-black/30 p-2 rounded">
                                    <span>1 = Calma / Estabilidad</span>
                                    <span>10 = Caos / Clímax</span>
                                </div>
                            </div>

                            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                <div className="flex justify-between mb-2">
                                    <strong className="text-white">3. Polaridad (Polarity)</strong>
                                    <span className="text-xs uppercase bg-white/10 px-2 rounded text-gray-400">Escala -10 a +10</span>
                                </div>
                                <p className="text-sm mb-2">Mide el cambio emocional (Valence Shift) del protagonista o el tono.</p>
                                <div className="flex justify-between text-xs text-gray-500 font-mono bg-black/30 p-2 rounded">
                                    <span className="text-blue-400">-10 = Tragedia / Pérdida</span>
                                    <span className="text-red-400">+10 = Victoria / Ganancia</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Algorithms */}
                    <section>
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <Brain size={18} className="text-purple-400" /> Algoritmo "Smart Pace"
                        </h3>
                        <p className="text-sm mb-3">
                            El sistema calcula un <strong>Pace Score (Puntaje de Ritmo)</strong> combinando estas métricas con la longitud de la escena y tu configuración de género.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-2 text-gray-400 pl-2">
                            <li><strong>Thriller:</strong> Penaliza escenas largas con baja acción (Foco bajo). Espera picos de Disonancia frecuentes.</li>
                            <li><strong>Sci-Fi:</strong> Tolera escenas más largas (Worldbuilding) pero monitorea la densidad de información.</li>
                            <li><strong>Oriental (Slice of Life):</strong> Valora los cambios de Polaridad (Emoción) sobre la Acción externa. El ritmo es más fluido.</li>
                        </ul>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-black/20 text-center">
                    <button
                        onClick={onClose}
                        className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded-lg font-bold transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
