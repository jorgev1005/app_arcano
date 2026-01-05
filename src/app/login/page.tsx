'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate, authenticateGoogle } from '@/lib/actions';
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

            <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Bienvenido</h1>
                    <p className="text-gray-400 mt-2 text-sm">Ingresa a tu espacio creativo</p>
                </div>

                <form action={dispatch} className="space-y-4">
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
                                    autoComplete="current-password"
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
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-black text-gray-500">O continúa con</span>
                    </div>
                </div>

                <form action={authenticateGoogle}>
                    <button
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-900 font-medium rounded-xl hover:bg-gray-100 transition-all"
                        type="submit"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Google
                    </button>
                </form>

                <div className="text-center text-sm text-gray-500">
                    ¿No tienes cuenta? <Link href="/register" className="text-blue-400 hover:text-blue-300">Regístrate</Link>
                </div>
            </div>
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
