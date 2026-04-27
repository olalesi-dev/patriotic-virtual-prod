import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `${process.env.DICOM_BASE_URL}/studies`,
      {
        headers: {
          "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID!,
          "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET!,
          "Accept": "application/json",
        },
      }
    );

    const text = await res.text();

    return NextResponse.json({
      status: res.status,
      raw: text,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}