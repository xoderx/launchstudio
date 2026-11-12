import { createLeadHandlers } from '../../../lib/lead-capture.mjs';
import { database } from '../../../lib/runtime.mjs';
export const { GET, POST } = createLeadHandlers({ database });
