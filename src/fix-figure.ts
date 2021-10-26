import fs = require('fs');
import { Context, Document } from "./context";
import { Criterion } from "./criterion";
import { Rule } from "./rule";
import { splitLines, StringOptional } from "./utility";

interface FigureConfig {
  lines: string[];
}

export class FixFigureRule extends Rule {
  private static figureCriterion = Criterion.inside("\\begin{figure}", "\\end{figure}");

  constructor(private figures: readonly FigureConfig[] = []) {
    super();
  }

  static fromPath(path: string): FixFigureRule {
    try {
      const lines = splitLines(fs.readFileSync(path, "utf-8"));
      const document = new Document(lines);
      const ranges = this.figureCriterion.ranges(document);
      return new FixFigureRule(ranges.map(([l, r]) => ({ lines: lines.slice(l, r) })));
    } catch (err: any) {
      if (err.code !== 'ENOENT')
        console.warn(err);
      return new FixFigureRule();
    }
  }

  execute(lines: string[]): string[] {
    const document = new Document(lines);
    const results: string[] = [];

    const ranges = FixFigureRule.figureCriterion.ranges(document);

    if (this.figures.length < ranges.length)
      ranges.splice(this.figures.length);

    let index = 0;

    for (let i = 0; i < ranges.length; ++i) {
      const [begin, end] = ranges[i];

      while (index < begin)
        results.push(lines[index++]);

      const indent = document.slice(begin, end).getIndent();
      results.push(...this.figures[i].lines.map(line => indent + line));
      index = end;
    }

    while (index < lines.length)
      results.push(lines[index++]);

    return results;
  }
}
