'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white font-sans">
            <div className="absolute inset-0 overflow-hidden z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            <form action={dispatch} className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Bienvenido</h1>
                    <p className="text-gray-400 mt-2 text-sm">Ingresa a tu espacio creativo</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 ml-1" htmlFor="email">
                            Email
                        </label>
                        <input
                            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-600 transition-all"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="nombre@ejemplo.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 ml-1" htmlFor="password">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-600 transition-all pr-12"
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <LoginButton />

                <div className="flex h-8 items-end space-x-1" aria-live="polite" aria-atomic="true">
                    {errorMessage && (
                        <p className="text-sm text-red-500">{errorMessage}</p>
                    )}
                </div>

                <div className="text-center text-sm text-gray-500">
                    ¿No tienes cuenta? <Link href="/register" className="text-blue-400 hover:text-blue-300">Regístrate</Link>
                </div>
            </form>
        </div>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all hover:shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-disabled={pending}
        >
            {pending ? 'Ingresando...' : 'Ingresar'}
        </button>
    );
}
