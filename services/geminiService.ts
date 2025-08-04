
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PreparedLyric, Theme, AspectRatio, TimedLyric } from '../types';

const ai = new GoogleGenAI({ 
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAeju9wA0z7NEPYqpHFGKKFO0RUf0qVBPs'
});

// Generic retry wrapper for all API calls
const withRetries = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            return await apiCall();
        } catch (error) {
            attempts++;
            if (attempts >= maxRetries) {
                console.error(`API call failed after ${maxRetries} attempts.`, error);
                throw error; // Re-throw the last error
            }
            const delay = 500 * Math.pow(2, attempts - 1); // Exponential backoff
            console.warn(`API call attempt ${attempts} failed. Retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // This part should be unreachable due to the throw inside the loop, but is needed for TS.
    throw new Error("API call failed after all retries.");
};


export const findLyrics = async (artist: string, songTitle: string): Promise<string> => {
    const prompt = `Find the full, accurate lyrics for the song "${songTitle}" by the artist "${artist}". Return *only* the lyrics as plain text. Do not include headers like '[Verse 1]', '[Chorus]', artist names, or any other text, just the raw lyrics. If you cannot find the lyrics, return the string "LYRICS_NOT_FOUND".`;

    const response = await withRetries(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
        },
    }));

    const lyricsText = response.text.trim();

    if (!lyricsText || lyricsText === "LYRICS_NOT_FOUND") {
        throw new Error("Could not find lyrics for the specified song. Please try again or paste them manually.");
    }

    return lyricsText;
};


const lyricLineSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            line: {
                type: Type.STRING,
                description: "A single line or short phrase from the lyrics."
            },
            visualPrompt: {
                type: Type.STRING,
                description: "A short, vivid prompt for an image generator that captures the mood of the line."
            },
            section: {
                type: Type.STRING,
                description: "The song section this line belongs to (e.g., 'verse', 'chorus', 'bridge', 'intro', 'outro')."
            },
            glyph: {
                type: Type.STRING,
                description: "Optional: A single, simple emoji or symbol (like ✨ or 💔) that represents the line's emotion. If none is suitable, omit this key."
            },
        },
        required: ['line', 'visualPrompt', 'section'],
    },
};

export const prepareLyricLines = async (lyrics: string): Promise<PreparedLyric[]> => {
    // Remove text in brackets [like this] from lyrics
    const cleanedLyrics = lyrics.replace(/\[.*?\]/g, '').replace(/\n\s*\n/g, '\n').trim();
    
    const prompt = `
You are a creative assistant for making lyric videos. Your task is to process the following song lyrics and structure them for a video.

Analyze the provided lyrics and do the following:
1.  Identify the song structure. Label each line with its section (e.g., 'verse', 'chorus', 'bridge', 'intro', 'outro'). Be consistent.
2.  Break the lyrics down into logical lines or short phrases suitable for display. Each line should be concise.
3.  For each line, create a short, vivid, and imaginative visual prompt for an image generator. The prompt should capture the mood and meaning of the lyric.
4.  Optionally, suggest a single, simple emoji or icon (a "glyph") that captures the line's emotion (e.g., "✨", "💔", "🌙"). If no glyph is suitable, omit the key.

Return your response as a single, minified JSON array of objects, with no surrounding text or markdown. Each object must have three keys: "line", "visualPrompt", "section", and optionally "glyph".

Here are the lyrics to process:
---
${cleanedLyrics}
---
`;

    const response = await withRetries(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: lyricLineSchema,
        },
    }));

    const text = response.text.trim();
    try {
        const parsedJson = JSON.parse(text);
        return parsedJson as PreparedLyric[];
    } catch (e) {
        console.error("Failed to parse JSON from Gemini:", text);
        throw new Error("AI returned malformed data. Please try again.");
    }
};

const getThemeStyle = (theme: Theme) => {
    switch(theme) {
        case 'rock':
            return 'heavy metal rock aesthetic, intense dramatic lighting, dark stormy atmosphere, lightning strikes, fire and smoke effects, metallic textures, leather and chains, concert stage lighting, powerful energy, aggressive mood, electric guitars, amplifiers, dramatic shadows, high contrast, cinematic rock concert photography';
        case 'country':
            return 'authentic country music aesthetic, rural American landscape, golden hour lighting, rustic barn wood textures, wide open fields, dusty roads, vintage pickup trucks, weathered denim and leather, warm earth tones, nostalgic Americana, heartland photography style, natural outdoor lighting, cinematic depth of field';
        case 'chill':
            return 'relaxing ambient aesthetic, soft pastel colors, dreamy atmosphere, gentle lighting, peaceful nature scenes, flowing water, sunset skies, cozy interiors, warm blankets, soft textures, minimalist composition, serene mood, calming vibes, meditation spaces, zen garden, soft focus, ethereal glow, tranquil cinematic photography';
        case 'underground':
            return 'underground hip-hop aesthetic, gritty urban environment, dark moody atmosphere, VHS tape distortion, analog glitch effects, lo-fi grainy texture, melancholic and introspective mood, raw emotional depth, street photography style, muted desaturated colors, dramatic shadows, authentic underground culture, cinematic depth of field';
        case 'default':
        default:
            return 'dramatic lighting, epic scale, high detail, cinematic photo';
    }
}

const audioSyncSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            line: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
            section: { type: Type.STRING },
            startTime: { type: Type.NUMBER },
            endTime: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER }
        },
        required: ['line', 'visualPrompt', 'section', 'startTime', 'endTime']
    }
};

export const autoSyncWithAI = async (
    audioFile: File,
    lyrics: PreparedLyric[]
): Promise<TimedLyric[]> => {
    // Convert audio file to base64
    const audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.readAsDataURL(audioFile);
    });

    // Get audio duration for better timing estimates
    const audioDuration = await new Promise<number>((resolve) => {
        const audio = new Audio(URL.createObjectURL(audioFile));
        audio.onloadedmetadata = () => resolve(audio.duration);
    });

    const prompt = `
You are an expert audio engineer with perfect pitch and timing. Analyze this ${Math.round(audioDuration)}s audio file and create precise vocal timing synchronization.

**CRITICAL INSTRUCTIONS:**
1. Listen for the EXACT moment each vocal phrase begins - not instrumental parts
2. Account for intro/outro instrumental sections
3. Detect natural pauses, breaths, and vocal phrasing
4. Consider song structure patterns (verse/chorus timing)
5. Each line duration should match actual vocal length (1.5-5s typical)
6. NO overlapping timestamps - ensure clean transitions
7. Add confidence score (0.0-1.0) for each timing

**LYRICS TO SYNC (${lyrics.length} lines):**
${lyrics.map((l, i) => `${i + 1}. [${l.section}] ${l.line}`).join('\n')}

**ANALYSIS PROCESS:**
- First pass: Identify vocal start/end points
- Second pass: Match lyrics to vocal segments
- Third pass: Refine timing for natural flow
- Final pass: Validate no gaps/overlaps

**OUTPUT REQUIREMENTS:**
- Preserve exact lyric text and metadata
- startTime: precise vocal onset (seconds, 1 decimal)
- endTime: natural vocal phrase end
- confidence: timing accuracy (0.8+ preferred)
- Total duration should not exceed ${Math.round(audioDuration)}s

Return optimized timing data as JSON array.`;

    const response = await withRetries(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                text: prompt
            },
            {
                inlineData: {
                    mimeType: audioFile.type,
                    data: audioBase64
                }
            }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: audioSyncSchema
        }
    }));

    try {
        const syncedLyrics = JSON.parse(response.text.trim());
        
        // Validate and optimize timing
        const optimizedLyrics = syncedLyrics.map((lyric: any, index: number) => {
            // Ensure minimum duration
            const minDuration = 1.5;
            const maxDuration = 6.0;
            let { startTime, endTime } = lyric;
            
            // Fix duration if too short/long
            if (endTime - startTime < minDuration) {
                endTime = startTime + minDuration;
            }
            if (endTime - startTime > maxDuration) {
                endTime = startTime + maxDuration;
            }
            
            // Prevent overlap with next lyric
            const nextLyric = syncedLyrics[index + 1];
            if (nextLyric && endTime > nextLyric.startTime) {
                endTime = nextLyric.startTime - 0.1;
            }
            
            return {
                ...lyric,
                startTime: Math.max(0, startTime),
                endTime: Math.min(audioDuration, endTime)
            };
        });
        
        return optimizedLyrics as TimedLyric[];
    } catch (e) {
        throw new Error("AI failed to sync lyrics with audio. Please try manual timing.");
    }
};

export const generateBackgroundImages = async (
    sections: string[], 
    fullLyrics: string, 
    allLyrics: TimedLyric[],
    artistName: string, 
    theme: Theme,
    aspectRatio: AspectRatio
): Promise<Record<string, string>> => {

    const imageGenerationPromises = sections.map(async (section) => {
        const sectionLyrics = allLyrics.filter(l => l.section === section);
        const sectionText = sectionLyrics.map(l => l.line).join('\n');
        const sectionDuration = sectionLyrics.length > 0 ? 
            sectionLyrics[sectionLyrics.length - 1].endTime - sectionLyrics[0].startTime : 10;
        
        // Generate 2-4 images based on section length and type
        const numImages = section === 'chorus' ? 3 : sectionDuration > 20 ? 3 : 2;
        const sectionImages = [];
        
        // Analyze section for emotional progression
        const analysisPrompt = `Analyze this ${section} for ${artistName}:

${sectionText}

Identify emotional progression and key moments. Respond with:
START_MOOD|MID_MOOD|END_MOOD|KEY_IMAGERY|ENERGY_SHIFT`;
        
        const analysisResponse = await withRetries(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: analysisPrompt,
        }));
        
        const [startMood, midMood, endMood, keyImagery, energyShift] = analysisResponse.text.trim().split('|');
        
        for (let i = 0; i < numImages; i++) {
            const progress = i / (numImages - 1);
            const currentMood = progress < 0.5 ? 
                (progress < 0.25 ? startMood : midMood) : endMood;
            const moment = i === 0 ? 'opening' : i === numImages - 1 ? 'climax' : 'building';
            
            const summaryPrompt = `
Create background ${i + 1}/${numImages} for ${artistName}'s ${section} (${moment}).

**LYRICS:**
${sectionText}

**FOCUS:** ${currentMood} - ${keyImagery}
**ENERGY:** ${energyShift}
**STYLE:** ${getThemeStyle(theme)}
**MOMENT:** ${moment} of the ${section}

**REQUIREMENTS:**
- Capture the specific ${currentMood} emotion
- Visual metaphors from: ${keyImagery}
- ${artistName}'s genre and style
- ${moment === 'climax' ? 'Peak emotional intensity' : moment === 'building' ? 'Rising tension' : 'Establish mood'}
- High quality, cinematic

**OUTPUT:** One powerful image for this ${moment}.`;
            const summaryResponse = await withRetries(() => ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: summaryPrompt,
            }));
            const finalImagePrompt = summaryResponse.text.trim();

            const imageResponse = await withRetries(async () => {
                const response = await ai.models.generateImages({
                    model: 'imagen-3.0-generate-002',
                    prompt: finalImagePrompt,
                    config: {
                      numberOfImages: 1,
                      outputMimeType: 'image/jpeg',
                      aspectRatio: aspectRatio,
                    },
                });
                
                if (!response.generatedImages || response.generatedImages.length === 0) {
                    throw new Error("Image generation returned no images.");
                }
                return response;
            });
            
            sectionImages.push({
                key: `${section}_${i}`,
                imageBytes: imageResponse.generatedImages[0].image.imageBytes
            });
        }
        
        return { section, images: sectionImages };
    });

    const results = await Promise.allSettled(imageGenerationPromises);

    const backgroundImages: Record<string, string> = {};
    const allImages: {key: string, imageBytes: string}[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            result.value.images.forEach(img => {
                backgroundImages[img.key] = img.imageBytes;
                allImages.push(img);
            });
        } else {
            console.error(`Promise failed for section ${sections[index]}:`, result.reason);
        }
    });

    if (allImages.length === 0) {
        throw new Error("All image generations failed. Please try again with a different song or theme.");
    }
    
    // Ensure all sections have at least one image
    sections.forEach(section => {
        const hasImage = Object.keys(backgroundImages).some(key => key.startsWith(section));
        if (!hasImage && allImages.length > 0) {
            backgroundImages[`${section}_0`] = allImages[0].imageBytes;
        }
    });

    return backgroundImages;
};
