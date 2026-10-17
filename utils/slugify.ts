export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')         // Trim - from start of text
    .replace(/-+$/, '');        // Trim - from end of text
}

// Optional: Ensure uniqueness if titles can duplicate by appending a short random string
export function generateUniqueSlug(title: string): string {
  const baseSlug = slugify(title);
  const randomSuffix = Math.random().toString(36).substring(2, 7); // Fixed: .toString(36) first, then .substring()
  return `${baseSlug}-${randomSuffix}`;
}