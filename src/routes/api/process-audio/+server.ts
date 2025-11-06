import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
  try {
    if (!request.body) {
      return new Response(JSON.stringify({ error: "No audio data provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file found in request" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!audioFile.type.startsWith("audio/")) {
      return new Response(
        JSON.stringify({ error: "File must be an audio file" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const buffer = await audioFile.arrayBuffer();
    const fileName = `recording-${Date.now()}.webm`;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Audio processed successfully",
        file: {
          name: fileName,
          size: buffer.byteLength,
          type: audioFile.type,
          duration: audioFile.size,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing audio:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const GET: RequestHandler = async () => {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "audio-processor",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
