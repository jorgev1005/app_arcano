import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "App Arcano",
    description: "Herramienta de escritura para autores",
};

import { SessionProvider } from 'next-auth/react';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body>
                <SessionProvider>
                    {children}
                </SessionProvider>
            </body>
        </html>
    );
}
