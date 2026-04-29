import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: { studyUID: string } }
) {
    try {
        const url = `${process.env.DICOM_BASE_URL}/studies/${params.studyUID}/metadata`;

        const res = await fetch(url, {
            headers: {
                "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID!,
                "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET!,
                Accept: "application/dicom+json",
            },
        });

        const text = await res.text();

        if (!text) {
            return NextResponse.json({ error: "Empty response from PACS" });
        }

        return NextResponse.json({
            status: res.status,
            raw: text,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}