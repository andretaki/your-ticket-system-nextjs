import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ticketEventEmitter } from '@/lib/eventEmitter';

export async function GET() {
  const headersList = headers();

  // Set up SSE headers
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'text/event-stream');
  responseHeaders.set('Cache-Control', 'no-cache');
  responseHeaders.set('Connection', 'keep-alive');
  responseHeaders.set('X-Accel-Buffering', 'no'); // Useful for Nginx buffering issues

  // Create a new ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log('SSE stream opened');
      let isClosed = false; // Flag to track stream state
      let keepAlive: NodeJS.Timeout | null = null; // Use NodeJS.Timeout type

      // --- Event Handler ---
      const handleEvent = (data: any) => {
        if (isClosed) return; // Don't enqueue if stream is marked as closed
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error: any) {
          // Log only unexpected errors, ERR_INVALID_STATE might happen if closed concurrently
          if (error.code !== 'ERR_INVALID_STATE') {
            console.error('SSE: Error sending data event:', error);
          }
          // Mark as closed if an error occurs during enqueue
          isClosed = true;
          if (keepAlive) clearInterval(keepAlive);
          unsubscribe();
          try { controller.close(); } catch {} // Attempt to close if not already
        }
      };

      // Subscribe to ticket events
      const unsubscribe = ticketEventEmitter.subscribe(handleEvent);

      // --- Keep-Alive Ping ---
      const sendPing = () => {
        if (isClosed) return; // Don't enqueue if stream is marked as closed
        try {
          controller.enqueue('event: ping\ndata: {}\n\n');
        } catch (error: any) {
          if (error.code !== 'ERR_INVALID_STATE') { // Log only unexpected errors
            console.error('SSE: Error sending keep-alive ping:', error);
          }
          // Mark as closed if an error occurs during enqueue
          isClosed = true;
          if (keepAlive) clearInterval(keepAlive);
          unsubscribe();
          try { controller.close(); } catch {} // Attempt to close if not already
        }
      };

      // Start the keep-alive interval
      keepAlive = setInterval(sendPing, 30000); // 30 seconds

      // --- Cleanup Function ---
      // This is called when the stream is cancelled/closed by the client or server
      const cleanup = () => {
        if (isClosed) return; // Avoid running cleanup multiple times

        isClosed = true; // Set the flag
        console.log('SSE stream closed. Cleaning up...');

        if (keepAlive) {
          clearInterval(keepAlive); // Clear the interval timer
          keepAlive = null;
          console.log('Keep-alive interval cleared.');
        }
        unsubscribe(); // Unsubscribe from the event emitter
        console.log('Unsubscribed from ticket events.');
        // No need to explicitly call controller.close() here usually,
        // as the stream cancellation handles it. But doesn't hurt to try.
        try {
             if (controller.desiredSize !== null) { // Check if it might still be open
                controller.close();
                console.log('Controller explicitly closed in cleanup.');
             }
        } catch (e) {
            // Ignore errors closing an already closed controller
            if ((e as any).code !== 'ERR_INVALID_STATE') {
                console.warn('Error during controller close in cleanup:', e);
            }
        }
      };

      return cleanup; // Return the cleanup function for the stream API
    },
    cancel(reason) {
      console.log(`SSE stream cancelled externally. Reason: ${reason}`);
      // The cleanup function returned by start() should still be called.
    },
  });

  return new NextResponse(stream, {
    headers: responseHeaders,
  });
}