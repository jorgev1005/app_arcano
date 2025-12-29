
export const genreModifiers: Record<string, {
    name: string;
    actionWeight: number;
    emotionWeight: number;
    dissonanceWeight: number;
    lengthTolerance: number;
    idealPace?: string;
}> = {
    "sci_fi": {
        name: "Ciencia Ficción / Space Opera",
        actionWeight: 1.0,
        emotionWeight: 1.0,
        dissonanceWeight: 1.3,
        lengthTolerance: 1500,
        idealPace: "Variable"
    },
    "thriller": {
        name: "Thriller / Acción",
        actionWeight: 1.5,
        emotionWeight: 0.8,
        dissonanceWeight: 1.5,
        lengthTolerance: 800,
        idealPace: "High"
    },
    "eastern_slice": {
        name: "Narrativa Oriental / Kishōtenketsu",
        actionWeight: 0.5,
        emotionWeight: 1.8,
        dissonanceWeight: 0.9,
        lengthTolerance: 2000, // Permite narrativa lenta
        idealPace: "Steady"
    },
    "custom": {
        name: "Personalizado / Estándar",
        actionWeight: 1.0,
        emotionWeight: 1.0,
        dissonanceWeight: 1.0,
        lengthTolerance: 1000,
        idealPace: "Balanced"
    }
};

interface SceneMetrics {
    focus: number;      // 0-10
    dissonance: number; // 1-10
    polarity: number;   // -10 to +10 (We need absolute change, or just final value? 
    // User spec says "Valor absoluto del cambio". 
    // For now we will assume the input 'polarity' IS the change or impact value)
    wordCount: number;
}

/**
 * Calculates a "Smart Pace" score (0-100) based on scene metrics and genre configuration.
 */
export function calculateSmartPace(
    metrics: SceneMetrics,
    selectedGenreKey: string = 'custom'
): { score: number; label: string; tip: string } {

    const mods = genreModifiers[selectedGenreKey] || genreModifiers['custom'];

    // 1. Calculate Intensity (Action + Mental Tension)
    // Focus (0-10) * Weight
    // Dissonance (1-10) * Weight
    const intensity = (metrics.focus * mods.actionWeight) +
        (metrics.dissonance * mods.dissonanceWeight);

    // 2. Calculate Emotional Impact (Polarity Change)
    // Using absolute value of polarity if it represents shift (-10 to 10 -> 0 to 20 range of movement)
    // Assuming the UI slider sends absolute "Magnitude of Change" or we calculate it elsewhere.
    // For this version, let's treat the input 'polarity' as the raw slider value (-10 to 10).
    // The ALGORITHM needs MAGNITUDE.
    const impact = Math.abs(metrics.polarity) * mods.emotionWeight;

    // 3. Calculate "Drag" (Freno)
    // Word Count / Tolerance.
    // Example: 2000 words / 1000 tolerance = 2.0 (Double drag, slows down pace by half)
    const safeWordCount = Math.max(metrics.wordCount, 100); // Prevent divide by zero or tiny text
    // Clamp Drag Factor: Never less than 0.75 (max 1.33x speed boost for distinct brevity), 
    // to prevent short low-tension scenes from becoming "Frenetic".
    const dragFactor = Math.max(0.75, safeWordCount / mods.lengthTolerance);

    // 4. Final Calculation
    // (Intensity + Impact) / Drag
    // Max possible numerator approx: (10*1.5) + (10*1.5) + (10*1.8) ~= 45-50
    // Drag factor 1.0 is standard.
    // Raw result range ~ 0 to 50.

    let rawPace = (intensity + impact) / dragFactor;

    // Normalize to 0-100
    // If result is 20, we want it to be ~100?
    // Let's Calibrate:
    // Standard Scene: Focus 5, Diss 5, Pol 5, Words 1000, Mod Custom.
    // Intensity = 5 + 5 = 10. Impact = 5. Total = 15.
    // Drag = 1.0.
    // Raw = 15.
    // To make 15 be "50/100" (Medium Pace), we multiply by ~3.3.
    // Let's try multiplier 4.
    const multiplier = 4;
    let finalScore = Math.min(100, Math.max(0, rawPace * multiplier));
    finalScore = Math.round(finalScore);

    // Generate Label & Tip
    let label = "Moderado";
    let tip = "";

    if (finalScore < 20) {
        label = "Lento / Contemplativo";
        if (selectedGenreKey === 'thriller') tip = "⚠️ Muy lento para un Thriller. Considera acortar o añadir conflicto.";
        else if (selectedGenreKey === 'sci_fi') tip = "Ritmo de exposición. Asegúrate de que la información sea vital.";
        else tip = "Buen momento para profundización de personajes.";
    } else if (finalScore > 80) {
        label = "Muy Rápido / Frenético";
        if (selectedGenreKey === 'eastern_slice') tip = "⚠️ Quizás demasiado intenso para el estilo oriental.";
        else tip = "Excelente para clímax o escenas de acción.";
    } else {
        label = "Fluido / Equilibrado";
        tip = "El ritmo es sostenible.";
    }

    return { score: finalScore, label, tip };
}
