# Guía de Despliegue en Vercel

Esta guía detalla cómo desplegar la aplicación Arcano en Vercel y configurar tu dominio personalizado `www.grupoaludra.com`.

## 1. Prerrequisitos

*   Cuenta en [Vercel](https://vercel.com).
*   Repositorio del proyecto en GitHub (asegúrate de haber subido los últimos cambios).
*   Acceso al cPanel de `www.grupoaludra.com`.

## 2. Despliegue en Vercel

1.  Inicia sesión en **Vercel** y haz clic en **"Add New..."** -> **"Project"**.
2.  Importa tu repositorio de GitHub `app_arcano`.
3.  En la configuración del proyecto (**Configure Project**):
    *   **Framework Preset**: Next.js (debería detectarse automáticamente).
    *   **Environment Variables**: Despliega esta sección y agrega las siguientes variables (copia los valores de tu `.env.local`):
        *   `MONGODB_URI`: Tu conexión a MongoDB Atlas.
        *   `AUTH_SECRET`: Tu secreto de autenticación (puedes generar uno nuevo o usar el existente).
        *   `OPENAI_API_KEY`: Tu clave de API para la IA.
        *   `INVITE_CODE`: **IMPORTANTE**. Define aquí la contraseña para nuevos registros (ej: `escritores2025`).

4.  Haz clic en **"Deploy"**. Vercel construirá la aplicación. Esto puede tardar unos minutos.

## 3. Configuración del Dominio (Vercel)

Una vez desplegado:
1.  Ve al Dashboard de tu proyecto en Vercel.
2.  Ve a **Settings** -> **Domains**.
3.  Ingresa `www.grupoaludra.com` y haz clic en **Add**.
4.  Vercel te mostrará unos registros DNS que necesitas configurar. Normalmente te sugerirá un registro **CNAME** o un registro **A**.

## 4. Configuración DNS (cPanel)

1.  Accede a tu cuenta de cPanel.
2.  Busca la sección **"Zone Editor"** o **"Editor de Zona DNS"**.
3.  Busca el dominio `grupoaludra.com`.
4.  **Si Vercel te pide un Registro A (para la raíz o @):**
    *   Edita el registro `A` existente para `grupoaludra.com` y cambia la IP por la que te da Vercel (generalmente `76.76.21.21`).
5.  **Si Vercel te pide un CNAME (para www):**
    *   Busca el registro para `www.grupoaludra.com`.
    *   Si es un registro `A`, elimínalo o cámbialo a `CNAME`.
    *   Apunta el CNAME a `cname.vercel-dns.com` (o lo que indique Vercel).

> **Nota**: Los cambios de DNS pueden tardar desde unos minutos hasta 24 horas en propagarse globalmente.

## 5. Verificación

1.  Intenta acceder a `https://www.grupoaludra.com`.
2.  Deberías ver la pantalla de Login de Arcano.
3.  Ve a **"Registrarse"**.
4.  Intenta crear una cuenta usando el `INVITE_CODE` que configuraste en el paso 2.
