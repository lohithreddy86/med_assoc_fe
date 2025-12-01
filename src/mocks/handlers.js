import { pdfHandlers } from "./handlers/pdfHandlers";
import { ocrHandlers } from "./handlers/ocrHandlers";
import { summaryHandlers } from "./handlers/summaryHandlers";

// Consolidate all MSW request handlers
export const handlers = [...pdfHandlers, ...ocrHandlers, ...summaryHandlers];
