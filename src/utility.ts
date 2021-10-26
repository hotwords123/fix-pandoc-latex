
export type StringOptional = string | null;
export type PatternLike = StringOptional | ((line: StringOptional) => boolean);

export type LineRange = [number, number];

export function assert(value: any, message?: string): asserts value {
  if (!value)
    throw new Error(message || "Assertion failed");
}

export function splitLines(str: string): string[] {
  return str.split(/\r*\n/);
}

export function testPattern(pattern: PatternLike | null, value: StringOptional): boolean {
  if (typeof pattern === 'function')
    return pattern(value);
  else
    return pattern === value;
}
