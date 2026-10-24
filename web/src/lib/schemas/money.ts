import { z } from "zod";

// No coercion: callers convert dollars to cents explicitly at the form boundary.
export const centsSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const signedCentsSchema = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
export const nonemptyText = z.string().trim().min(1).max(2000);
export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
