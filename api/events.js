export default function handler(_request, response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });

  response.end(`event: ready\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
}
