# Arcano - Aplicación para Gestionar Escrituras

Arcano es una herramienta de escritura basada en web, inspirada en Scrivener, diseñada para ayudar a los escritores a gestionar múltiples proyectos, organizar escenas y capítulos, y obtener asistencia de IA para la escritura creativa.

## Características

- **Gestión de Proyectos**: Crea y administra múltiples proyectos de escritura.
- **Enlazador**: Organización jerárquica de archivos y carpetas.
- **Editor**: Editor de texto enriquecido para escribir escenas.
- **Corcho**: Vista visual basada en tarjetas de escenas.
- **Esquema**: Vista de tabla con estado y conteos de palabras.
- **Inspector**: Notas, sinopsis, metadatos y herramientas de IA para cada archivo.
- **Asistencia de IA**: Genera personajes, ambientes e ideas de trama usando OpenAI.
- **Exportación**: Compila proyectos a PDF.

## Configuración

1. Clona el repositorio.
2. Instala dependencias: `npm install`
3. Configura variables de entorno en `.env.local`:
   - `MONGODB_URI`: Tu cadena de conexión de MongoDB.
   - `OPENAI_API_KEY`: Tu clave de API de OpenAI.
4. Ejecuta el servidor de desarrollo: `npm run dev`

## Despliegue

Despliega en Vercel o tu plataforma de nube preferida. Usa MongoDB Atlas para la base de datos.

## Uso

- Crea un proyecto.
- Agrega archivos y carpetas en el Enlazador.
- Escribe en el Editor, cambia a vistas de Corcho o Esquema.
- Usa el Inspector para notas y generación de IA.
- Exporta tu proyecto cuando esté listo.
