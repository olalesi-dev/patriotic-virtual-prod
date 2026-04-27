import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const studyUID = searchParams.get("studyUID");
        const seriesUID = searchParams.get("seriesUID");

        const res = await fetch(
            `${process.env.DICOM_BASE_URL}/studies/${studyUID}/series/${seriesUID}/instances`,
            {
                headers: {
                    "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID!,
                    "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET!,
                    "Accept": "application/dicom+json",
                },
            }
        );

        const data = await res.json();

        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}