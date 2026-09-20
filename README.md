# Arcano - Aplicación para Gestionar Escrituras

Arcano es una herramienta de escritura basada en web, inspirada en Scrivener, diseñada para ayudar a los escritores a gestionar múltiples proyectos, organizar escenas y capítulos, y obtener asistencia de IA para la escritura creativa.

## Características

- **Gestión de Proyectos**: Crea y administra múltiples proyectos de escritura.
- **Enlazador**: Organización jerárquica de archivos y carpetas.
- **Editor**: Editor de texto enriquecido para escribir escenas.
- **Corcho**: Vista visual basada en tarjetas de escenas.
- **Esquema**: Vista de tabla con estado y conteos de palabras.
- **Inspector**: Notas, sinopsis, metadatos y herramientas de IA para cada archivo.
- **Asistencia de IA**: Genera personajes, ambientes, análisis narrativo y síntesis de ideas usando Google Gemini.
- **Visualizaciones Avanzadas**: Corcho Libre (Canvas), Grafo de Relaciones y Análisis de Ritmo Literario.
- **Exportación Versátil**: eBook (.epub / Kindle), Vista Previa de Impresión/PDF y Copia de Seguridad Completa (.json).

## Configuración

1. Clona el repositorio.
2. Instala dependencias: `npm install`
3. Configura variables de entorno en `.env.local`:
   - `MONGODB_URI`: Tu cadena de conexión de MongoDB.
   - `AUTH_SECRET`: Secreto para firma de sesiones NextAuth v5.
   - `GOOGLE_API_KEY`: Tu clave de API de Google Gemini.
   - `INVITE_CODE`: Código de registro para escritores invitados.
4. Ejecuta el servidor de desarrollo: `npm run dev`

## Despliegue

Despliega en Vercel conectado a MongoDB en tu VPS o MongoDB Atlas.

## Uso

- Crea un proyecto o importa una copia de seguridad.
- Agrega archivos y carpetas en el Enlazador (Binder).
- Escribe en el Editor y consulta el ritmo narrativo y grafo de personajes.
- Usa el Inspector para notas, sinopsis y generación asistida por Gemini.
- Exporta tu proyecto en eBook (.epub) o imprime directamente.
