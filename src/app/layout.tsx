import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from 'next-auth/react';
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const viewport: Viewport = {
    themeColor: "#0a0a0a",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export const metadata: Metadata = {
    title: "Arcano - Estudio de Escritura",
    description: "Herramienta definitiva de escritura creativa y estructuración de historias",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Arcano",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                <link rel="apple-touch-icon" href="/globe.svg" />
            </head>
            <body>
                <ServiceWorkerRegistration />
                <SessionProvider>
                    {children}
                </SessionProvider>
            </body>
        </html>
    );
}
