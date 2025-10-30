import { z } from "zod";

const browserEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z
      .string()
      .min(1, "NEXT_PUBLIC_SUPABASE_URL is required")
      .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z
      .string()
      .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
  })


const serverEnvSchema = browserEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .transform((value) => value || undefined)
    .optional()
});

type AnyZodObject = z.ZodObject<any, any, any>;

function getEnv<T extends AnyZodObject>(schema: T) {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${message}`);
  }
  return parsed.data;
}

export const browserEnv = getEnv(browserEnvSchema);
export const serverEnv = getEnv(serverEnvSchema);

export type BrowserEnv = typeof browserEnv;
export type ServerEnv = typeof serverEnv;
