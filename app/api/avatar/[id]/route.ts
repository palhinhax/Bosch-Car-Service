import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Streams a colaborador's profile photo from the private B2 bucket. Requires a
// signed-in session — the bucket is never exposed publicly.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    select: { avatarKey: true },
  });
  if (!employee?.avatarKey) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { body, contentType } = await getObject(employee.avatarKey);
    // Copy into a fresh ArrayBuffer-backed view so the type satisfies BodyInit.
    const bytes = new Uint8Array(body.byteLength);
    bytes.set(body);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType ?? "image/jpeg",
        // Versioned URL (?v=key) makes this safe to cache in the browser.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
