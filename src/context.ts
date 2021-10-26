import { StringOptional, LineRange } from "./utility";

const tabSize = 2;

function indentOf(line: string) {
  return line.match(/^\s*/)![0].replace(/\t/g, ' '.repeat(tabSize))
}

function removeIndent(line: string) {
  return line.trimLeft();
}

function indentMin(a: string, b: string) {
  return a.length < b.length ? a : b;
}

function indentMax(a: string, b: string) {
  return a.length > b.length ? a : b;
}

export class Document {
  constructor(private _lines: readonly string[]) {}

  get lines() { return this._lines; }

  get lineCount() { return this._lines.length; }

  slice(start: number, end: number): Context {
    return new Context(this, start, end);
  }
}

export class Context {
  constructor(private _document: Document, private start: number, private end: number) {}

  private get lines() {
    return this._document.lines;
  }

  get document() {
    return this._document;
  }

  get range(): LineRange {
    return [this.start, this.end];
  }

  get lineCount() {
    return this.end - this.start;
  }

  self(index: number = 0): StringOptional {
    return index >= 0 && index < this.lineCount ? removeIndent(this.lines[this.start + index]) : null;
  }

  selves(): string[] {
    return this.lines.slice(this.start, this.end).map(line => removeIndent(line));
  }

  prev(count: number = 1): StringOptional {
    const index = this.start - count;
    return index >= 0 ? removeIndent(this.lines[index]) : null;
  }

  next(count: number = 1): StringOptional {
    const index = this.end + count - 1;
    return index < this.lines.length ? removeIndent(this.lines[index]) : null;
  }

  private indentAt(index: number) {
    if (index >= 0 && index < this.lines.length)
      return indentOf(this.lines[index]);
    else
      return '';
  }

  private indentsAt(start: number, end: number) {
    return this.lines.slice(start, end).map(line => indentOf(line));
  }

  getIndent(): string {
    if (this.lineCount > 0) {
      return this.indentsAt(this.start, this.end).reduce((a, b) => indentMin(a, b));
    } else {
      return indentMax(this.indentAt(this.start - 1), this.indentAt(this.end));
    }
  }
}
