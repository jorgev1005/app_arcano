'use client';

import { useState } from 'react';
import { X, MessageSquare, Send, Loader2 } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const [type, setType] = useState('bug');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, message }),
            });

            if (res.ok) {
                setIsSuccess(true);
                setTimeout(() => {
                    onClose();
                    setIsSuccess(false);
                    setMessage('');
                    setType('bug');
                }, 2000);
            } else {
                alert('Error al enviar el feedback. Inténtalo de nuevo.');
            }
        } catch (error) {
            console.error(error);
            alert('Error al enviar el feedback.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-white font-medium flex items-center gap-2">
                        <MessageSquare size={18} className="text-purple-400" />
                        Enviar Comentarios
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                                <Send className="text-green-400" size={24} />
                            </div>
                            <h4 className="text-white font-medium text-lg">¡Enviado!</h4>
                            <p className="text-gray-400 text-sm mt-1">Gracias por ayudarnos a mejorar.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Tipo</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setType('bug')}
                                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${type === 'bug' ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'}`}
                                    >
                                        Error
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('suggestion')}
                                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${type === 'suggestion' ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'}`}
                                    >
                                        Sugerencia
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('other')}
                                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${type === 'other' ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'}`}
                                    >
                                        Otro
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Mensaje</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                    placeholder="Cuéntanos qué pasó o qué te gustaría ver..."
                                    className="w-full h-32 px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none text-sm"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !message.trim()}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Enviar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
