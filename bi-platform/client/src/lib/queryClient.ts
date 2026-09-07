import { QueryClient } from "@tanstack/react-query";

/**
 * Single react-query client shared by tRPC and the rest of the app.
 *
 * Exported from its own module so `signOut` can wipe cached responses; the
 * previous user's briefings, campaigns and admin data must never survive
 * into the next session in the same browser tab.
 */
export const queryClient = new QueryClient();
