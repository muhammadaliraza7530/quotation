import { z, ZodError, type ZodTypeAny } from "zod";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function parseJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}

export function validateBody<Schema extends ZodTypeAny>(
  body: unknown,
  schema: Schema,
): z.infer<Schema> {
  try {
    return schema.parse(body) as z.infer<Schema>;
  } catch (error) {
    if (error instanceof ZodError) {
      const message =
        error.errors.map((issue) => issue.message).join(", ") || "Invalid request body";
      throw new ApiError(message, 400);
    }
    throw new ApiError("Invalid request body", 400);
  }
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 });
}

export function notFound(message = "Not found") {
  return Response.json({ error: message }, { status: 404 });
}

export function conflict(message = "Conflict") {
  return Response.json({ error: message }, { status: 409 });
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
