import { z } from "zod";

/**
 * Converts a string to a URL-friendly slug
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters except hyphens and underscores
 * - Removes consecutive hyphens
 * - Trims hyphens from start/end
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Trim hyphens from start
    .replace(/-+$/, ""); // Trim hyphens from end
}

/**
 * Validates a slug (username or filename)
 * Returns error message if invalid, null if valid
 */
export function validateSlug(
  value: string,
  fieldName: string = "value",
  minLength: number = 3,
  maxLength: number = 64
): string | null {
  if (!value) return `${fieldName} is required`;
  if (value.length < minLength)
    return `${fieldName} must be at least ${minLength} characters`;
  if (value.length > maxLength)
    return `${fieldName} must be less than ${maxLength} characters`;
  if (!/^[a-z0-9_-]+$/.test(value)) {
    return `${fieldName} can only contain lowercase letters, numbers, hyphens, and underscores`;
  }
  if (value.startsWith("-") || value.endsWith("-")) {
    return `${fieldName} cannot start or end with a hyphen`;
  }
  return null;
}

/**
 * Zod schema for username validation
 */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(64, "Username must be less than 64 characters")
  .regex(
    /^[a-z0-9_-]+$/,
    "Username can only contain lowercase letters, numbers, hyphens, and underscores"
  )
  .refine((val) => !val.startsWith("-") && !val.endsWith("-"), {
    message: "Username cannot start or end with a hyphen",
  });

/**
 * Zod schema for filename validation
 */
export const filenameSchema = z
  .string()
  .min(3, "Filename must be at least 3 characters")
  .max(128, "Filename must be less than 128 characters")
  .regex(
    /^[a-z0-9_-]+$/,
    "Filename can only contain lowercase letters, numbers, hyphens, and underscores"
  )
  .refine((val) => !val.startsWith("-") && !val.endsWith("-"), {
    message: "Filename cannot start or end with a hyphen",
  });

/**
 * Generates a unique slug by appending a number if needed
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
