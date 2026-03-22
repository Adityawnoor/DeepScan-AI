'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing audio to detect deepfakes.
 *
 * - analyzeAudioForDeepfake - A function that handles the deepfake detection process for audio files.
 * - AnalyzeAudioForDeepfakeInput - The input type for the analyzeAudioForDeepfake function.
 * - AnalyzeAudioForDeepfakeOutput - The return type for the analyzeAudioForDeepfake function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeAudioForDeepfakeInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeAudioForDeepfakeInput = z.infer<typeof AnalyzeAudioForDeepfakeInputSchema>;

const AnalyzeAudioForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean().describe('True if the audio is detected as a deepfake, false otherwise.'),
  confidence:
    z.number()
      .min(0)
      .max(100)
      .describe('A confidence score (0-100) indicating the likelihood of the audio being a deepfake.'),
  explanation:
    z.string().describe('A detailed explanation of the analysis and reasoning for the verdict.'),
  suspiciousSegments:
    z.array(
      z.object({
        startTime: z.number().describe('The start time of the suspicious segment in seconds.'),
        endTime: z.number().describe('The end time of the suspicious segment in seconds.'),
        reason:
          z.string()
            .describe('The reason why this specific segment is considered suspicious.'),
      })
    )
    .optional()
    .describe('An optional array of time segments in the audio that show signs of manipulation.'),
});
export type AnalyzeAudioForDeepfakeOutput = z.infer<typeof AnalyzeAudioForDeepfakeOutputSchema>;

export async function analyzeAudioForDeepfake(
  input: AnalyzeAudioForDeepfakeInput
): Promise<AnalyzeAudioForDeepfakeOutput> {
  return analyzeAudioForDeepfakeFlow(input);
}

const audioDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'audioDeepfakeDetectionPrompt',
  input: { schema: AnalyzeAudioForDeepfakeInputSchema },
  output: { schema: AnalyzeAudioForDeepfakeOutputSchema },
  prompt: `You are an expert in vocal forensics. Your task is to detect AI-synthesized speech while avoiding false positives from low-quality recordings or background noise.

Search for corroborating evidence of synthesis:
1. **Robotic Resonances**: Identify metallic or "tinny" textures that indicate a neural vocoder failing to replicate human vocal tract resonance.
2. **Prosodic Unnaturalness**: Detect micro-fluctuations in pitch or tempo that do not align with natural human emotional emphasis or breathing patterns.
3. **Spectral Inconsistencies**: Look for "ghosting" frequencies or unnatural silence gaps that are common in concatenated or generated speech.
4. **Transition Artifacts**: Check for "clicks" or "warps" between words where a generative model may have struggled with co-articulation.

BE CAREFUL: Do not mistake compression artifacts from a phone call or internet stream for AI artifacts. Only flag as deepfake if you see clear signs of algorithmic synthesis.

Audio to analyze: {{media url=audioDataUri}}`,
});

const analyzeAudioForDeepfakeFlow = ai.defineFlow(
  {
    name: 'analyzeAudioForDeepfakeFlow',
    inputSchema: AnalyzeAudioForDeepfakeInputSchema,
    outputSchema: AnalyzeAudioForDeepfakeOutputSchema,
  },
  async (input) => {
    const { output } = await audioDeepfakeDetectionPrompt(input);
    if (!output) {
      throw new Error('AI did not return an output for audio deepfake detection.');
    }
    return output;
  }
);