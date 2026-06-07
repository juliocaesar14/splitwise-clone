export function serialize(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (value instanceof Date) return [key, value.toISOString()];
      if (
        value !== null &&
        typeof value === "object" &&
        "toFixed" in value &&
        typeof (value as { toFixed: unknown }).toFixed === "function"
      ) return [key, value.toString()];
      if (Array.isArray(value))
        return [key, value.map((v) =>
          typeof v === "object" && v !== null
            ? serialize(v as Record<string, unknown>) : v
        )];
      if (value !== null && typeof value === "object")
        return [key, serialize(value as Record<string, unknown>)];
      return [key, value];
    })
  );
}