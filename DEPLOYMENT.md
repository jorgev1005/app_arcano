# Guía de Despliegue en Vercel

Esta guía detalla cómo desplegar la aplicación Arcano en Vercel y configurar tu dominio personalizado.

## 1. Prerrequisitos

*   Cuenta en [Vercel](https://vercel.com).
*   Repositorio del proyecto en GitHub (asegúrate de haber subido los últimos cambios).
*   Acceso al cPanel de `grupoaludra.com`.

## 2. Despliegue en Vercel

1.  Inicia sesión en **Vercel** y haz clic en **"Add New..."** -> **"Project"**.
2.  Importa tu repositorio de GitHub `app_arcano`.
3.  En la configuración del proyecto (**Configure Project**):
    *   **Framework Preset**: Next.js (debería detectarse automáticamente).
    *   **Environment Variables**: Despliega esta sección y agrega las siguientes variables (copia los valores de tu `.env.local`):
        *   `MONGODB_URI`: Tu conexión a MongoDB Atlas (debe incluir usuario y contraseña correctos).
        *   `AUTH_SECRET`: Tu secreto de autenticación.
        *   `GOOGLE_API_KEY`: Tu clave de API de Google Gemini (para la IA).
        *   `INVITE_CODE`: **IMPORTANTE**. Define aquí la contraseña para nuevos registros (ej: `escritores2025`).

4.  Haz clic en **"Deploy"**. Vercel construirá la aplicación. Esto puede tardar unos minutos.

## 3. Configuración del Dominio (Subdominio)

Configuramos la aplicación para funcionar en `arcano.grupoaludra.com`.

1.  **En Vercel**:
    *   Ve a **Settings** -> **Domains**.
    *   Añade el dominio: `arcano.grupoaludra.com`.
    *   Vercel te mostrará una configuración requerida (CNAME).

2.  **En tu cPanel (Proveedor de Dominio)**:
    *   Ve a la herramienta **Zone Editor** o **DNS Manager**.
    *   Busca tu dominio `grupoaludra.com`.
    *   Añade un nuevo registro (+ Record):
        *   **Type**: `CNAME`
        *   **Name**: `arcano`
        *   **Value (Target)**: `cname.vercel-dns.com` (o el valor que indique Vercel).
        *   **TTL**: 14400 (o el defecto).

3.  **Verificación**:
    *   Vuelve a Vercel. El indicador debe pasar a "Valid Configuration" ✅.
    *   Vercel generará automáticamente el certificado SSL (HTTPS).

## 4. Cómo Actualizar la Aplicación (CI/CD)

Vercel tiene un sistema de **Despliegue Continuo**. Esto significa que actualizar la aplicación en producción es automático:

1.  **Haz tus cambios en local**: Edita el código en tu computadora como siempre.
2.  **Prueba**: Asegúrate de que todo funcione (`npm run dev`).
3.  **Sube los cambios a GitHub**:
    Abre tu terminal y ejecuta:
    ```bash
    git add .
    git commit -m "Descripción de tus cambios"
    git push origin master
    ```
4.  **Listo**:
    *   Vercel detectará automáticamente el nuevo "commit" en GitHub.
    *   Iniciará un nuevo "Build" (construcción) en sus servidores.
    *   Si todo sale bien, la nueva versión reemplazará a la anterior en `arcano.grupoaludra.com` en unos minutos.

> **Nota**: Si la actualización falla (por ejemplo, un error de código), Vercel mantendrá la versión anterior funcionando para no romper el sitio. Puedes ver el estado en el Dashboard de Vercel.
