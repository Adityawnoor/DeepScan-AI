'use client';

import { EventEmitter } from 'events';

/**
 * A central event emitter for surfacing Firebase-related errors.
 */
export const errorEmitter = new EventEmitter();
