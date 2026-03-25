'use server';
/**
 * @fileOverview This file implements "Temporal Neural Synergy" for video analysis.
 * 
 * - analyzeVideoForDeepfake - Performs cross-modal synchronization and temporal coherence checks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeVideoForDeepfakeInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe("The video to analyze as a data URI."),
  learnedContext: z.string().optional().describe('MANDATORY Ground Truth context from private vault and cloud base.'),
});

const AnalyzeVideoForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean(),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  crossModalSync: z.object({
    audioVisualAlignment: z.number().describe("Score of how well the audio phonemes match the visual visemes (0-100)."),
    lipSyncVerdict: z.string().describe("Forensic notes on mouth movement vs vocal track."),
    isDubbed: z.boolean().describe("Whether the audio track appears to be AI-cloned or dubbed over real footage."),
  }),
  temporalCoherence: z.object({
    shimmeringScore: z.number().describe("Level of 'ghosting' or pixel shimmering detected between frames."),
    identityConsistency: z.number().describe("How well the face maintains identity across temporal shifts."),
  }),
  suspiciousTimestamps: z.array(z.object({
    timestamp: z.number().describe('Timestamp in seconds.'),
    description: z.string().describe("Reason for anomaly (e.g., 'Face warping', 'Sync lag')."),
  })).optional(),
});

const temporalSynergyEngine = ai.definePrompt({
  name: 'temporalSynergyEngine',
  input: { schema: AnalyzeVideoForDeepfakeInputSchema },
  output: { schema: AnalyzeVideoForDeepfakeOutputSchema },
  prompt: `You are the world's leading "Temporal Neural Forensic Analyst". Your specialty is detecting cross-modal discrepancies in video.

  ### MANDATORY GROUND TRUTH (NEURAL MEMORY)
  {{#if learnedContext}}
  The following verified HUMAN observations MUST be prioritized. If patterns described here appear, flag it immediately.
  {{{learnedContext}}}
  {{/if}}

  TASK 1: CROSS-MODAL SYNCHRONIZATION (THE "SYNC GHOST")
  Analyze the audio track against the speaker's lip movements. 
  Look for:
  - Latency: Is the audio arriving 2-3 frames before the viseme?
  - Phoneme Mismatch: Does an 'M' sound occur while the lips are open?
  - Voice Fingerprint: Does the vocal texture have neural vocoder artifacts (robotic resonance)?

  TASK 2: TEMPORAL COHERENCE
  Identify "Neural Shimmer" - pixel-level inconsistencies that appear during rapid movement or head turns.
  Check for "Face Popping" - where the deepfake mask momentarily detaches from the subject's skull.

  TASK 3: IDENTITY STABILITY
  Does the subject's bone structure or eye color shift subtly over time?

  Video: {{media url=videoDataUri}}`,
});

export async function analyzeVideoForDeepfake(input: z.infer<typeof AnalyzeVideoForDeepfakeInputSchema>) {
  const { output } = await temporalSynergyEngine(input);
  if (!output) {
    throw new Error('Temporal Synergy Engine failed to return a forensic report.');
  }
  return output;
}
