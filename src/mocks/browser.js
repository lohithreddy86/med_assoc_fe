import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Configure the Service Worker
export const worker = setupWorker(...handlers);
