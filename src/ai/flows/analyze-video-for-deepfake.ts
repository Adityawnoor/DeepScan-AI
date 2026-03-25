'use server';
/**
 * @fileOverview This file implements "Temporal Neural Synergy" with Reverse Search Provenance.
 * 
 * - analyzeVideoForDeepfake - Performs cross-modal synchronization, temporal consistency checks, and source origin identification.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeVideoForDeepfakeInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe("The video to analyze as a data URI."),
  learnedContext: z.string().optional().describe('MANDATORY Ground Truth context.'),
});

const AnalyzeVideoForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean(),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  sourceOrigin: z.string().describe("Identified original source (e.g., '2018 Interview with BBC', 'Viral TikTok clip')."),
  originalContext: z.string().describe("Forensic evidence of original source identification."),
  neuralAncestry: z.object({
    modelFamily: z.string(),
    likelyModel: z.string(),
    fingerprintConfidence: z.number(),
  }),
  behavioralBiometrics: z.object({
    blinkConsistency: z.number().describe("Score of eye blinking naturalness (0-100)."),
    headMovementFluidity: z.number().describe("Score of head movement naturalness (0-100)."),
    temporalStability: z.number().describe("Score of frame-to-frame consistency and absence of face-shifts (0-100)."),
    notes: z.string(),
  }),
  crossModalSync: z.object({
    audioVisualAlignment: z.number(),
    lipSyncVerdict: z.string(),
    isDubbed: z.boolean(),
  }),
  suspiciousSegments: z.array(z.object({
    startTime: z.number(),
    endTime: z.number(),
    isSynthetic: z.boolean(),
    description: z.string(),
  })).optional(),
});

const temporalSynergyEngine = ai.definePrompt({
  name: 'temporalSynergyEngine',
  input: { schema: AnalyzeVideoForDeepfakeInputSchema },
  output: { schema: AnalyzeVideoForDeepfakeOutputSchema },
  prompt: `You are the Temporal Neural Forensic Analyst.

  TASK 1: TEMPORAL CONSISTENCY AI (CRITICAL)
  Analyze the video for frame-to-frame coherence. 
  Look specifically for:
  - Sudden face shifts or "mask jumps" during rotation.
  - Frame glitches or resolution mismatches in the facial region vs the background.
  - Motion inconsistencies (jitter) that break physical laws.
  Provide a "temporalStability" score.

  TASK 2: PROVENANCE TRACE (REVERSE SEARCH SIMULATION)
  Identify if this video is a manipulated version of an existing, real-world clip.
  Search your internal records for matching events, speeches, or famous videos.
  Provide a specific "sourceOrigin" (e.g., "Edited from 2021 Apple Keynote", "Deepfake of 2017 interview").

  TASK 3: BEHAVIOR-BASED DETECTION
  Analyze eye blinking patterns (frequency/duration) and head movement fluidity.

  TASK 4: CROSS-MODAL SYNCHRONIZATION
  Check lip-sync vs vocal track for modal discrepancies (phoneme-viseme alignment).

  TASK 5: TIMELINE BREAKDOWN (MANDATORY)
  Identify EXACT seconds that are synthetic or real.

  Video: {{media url=videoDataUri}}`,
});

export async function analyzeVideoForDeepfake(input: z.infer<typeof AnalyzeVideoForDeepfakeInputSchema>) {
  const { output } = await temporalSynergyEngine(input);
  if (!output) throw new Error('Temporal Synergy Engine failed.');
  return output;
}