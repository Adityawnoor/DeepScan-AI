import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-image-for-deepfake.ts';
import '@/ai/flows/analyze-audio-for-deepfake.ts';
import '@/ai/flows/analyze-video-for-deepfake.ts';
