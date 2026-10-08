// Reads a text field, treating missing fields and file uploads as empty.
export function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
