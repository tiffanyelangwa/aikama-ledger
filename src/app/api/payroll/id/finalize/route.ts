import { NextResponse } from "next/server";
import { finalizePayroll } from "@/lib/payroll";
import { getCurrentProfile } from "@/lib/auth";


export async function POST(
  request: Request,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {

  const profile = await getCurrentProfile();


  if (!profile) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }


  try {

    const journalEntry =
      await finalizePayroll(
        params.id,
        profile.id
      );


    return NextResponse.json({
      success: true,
      journalEntry,
    });


  } catch (error) {

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );

  }
}