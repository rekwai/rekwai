import { NextResponse } from "next/server";

export async function GET() {
  const backend_service_url = process.env.BACKEND_SERVICE_URL;

  if (!backend_service_url) {
    throw new Error("BACKEND_SERVICE_URL environment variable is required");
  }

  return NextResponse.json(
    {
      backend_service_url,
    },
    { status: 200 },
  );
}
