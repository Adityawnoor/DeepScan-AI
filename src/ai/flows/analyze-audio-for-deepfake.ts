
'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing audio to detect deepfakes using rhythmic behavior.
 *
 * - analyzeAudioForDeepfake - A function that handles the deepfake detection process for audio files.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeAudioForDeepfakeInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio to analyze, as a data URI that must include a MIME type and use Base64 encoding."
    ),
  learnedContext: z.string().optional().describe('Contextual knowledge learned from previously labeled datasets and user feedback.'),
});

const AnalyzeAudioForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean().describe('True if the audio is detected as a deepfake, false otherwise.'),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  behavioralBiometrics: z.object({
    speechProsody: z.number().describe("Score of how natural the speech rhythm and cadence is (0-100)."),
    breathAlignment: z.number().describe("Score of how well pauses align with human lung capacity (0-100)."),
    notes: z.string(),
  }).optional(),
  suspiciousSegments: z.array(
    z.object({
      startTime: z.number().describe('Start time in seconds.'),
      endTime: z.number().describe('End time in seconds.'),
      isSynthetic: z.boolean().describe('Whether this specific segment is synthetic or real.'),
      description: z.string().describe("Reason for anomaly or confirmation of authenticity."),
    })
  ).optional(),
});

const audioDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'audioDeepfakeDetectionPrompt',
  input: { schema: AnalyzeAudioForDeepfakeInputSchema },
  output: { schema: AnalyzeAudioForDeepfakeOutputSchema },
  prompt: `You are an elite vocal forensics expert specializing in Behavioral Speech Analysis.

{{#if learnedContext}}
### LEARNED KNOWLEDGE BASE (MANDATORY)
Incorporate these user-verified observations to identify patterns:
{{{learnedContext}}}
{{/if}}

TASK 1: SPEECH RHYTHM (PROSODY)
Analyze the cadence. Are the pauses natural or "too perfect"?
Look for micro-stutters or "breathless" sentences characteristic of neural vocoders.

TASK 2: TIMELINE BREAKDOWN (MANDATORY)
Break the audio into logical segments (e.g., [0-5s], [5-10s]). 
For EACH segment, determine if it is "Real" or "Synthetic".
Be precise with start and end times. Identify exactly where synthetic cloning begins.

Audio to analyze: {{media url=audioDataUri}}`,
});

export async function analyzeAudioForDeepfake(
  input: z.infer<typeof AnalyzeAudioForDeepfakeInputSchema>
): Promise<z.infer<typeof AnalyzeAudioForDeepfakeOutputSchema>> {
  const { output } = await audioDeepfakeDetectionPrompt(input);
  if (!output) {
    throw new Error('AI did not return an output for audio deepfake detection.');
  }
  return output;
}
