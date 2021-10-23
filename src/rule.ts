import { Context } from "./context";
import { Criterion, PatternLike } from "./criterion";

export abstract class Rule {
  protected criterion = Criterion.AND();

  before(...args: Parameters<(typeof Criterion)["before"]>): this {
    this.criterion.add(Criterion.before(...args));
    return this;
  }

  after(...args: Parameters<(typeof Criterion)["after"]>): this {
    this.criterion.add(Criterion.after(...args));
    return this;
  }

  either(...criteria: (Criterion | Criterion[])[]): this {
    this.criterion.add(Criterion.OR(criteria.flat()));
    return this;
  }

  where(...args: Parameters<(typeof Criterion)["custom"]>): this {
    this.criterion.add(Criterion.custom(...args));
    return this;
  }

  abstract execute(lines: string[]): string[];

  static insert(...args: Parameters<InsertRule["insert"]>): InsertRule {
    return new InsertRule().insert(...args);
  }

  static replace(...args: Parameters<ReplaceRule["replace"]>): ReplaceRule {
    return new ReplaceRule().replace(...args);
  }
}

export class InsertRule extends Rule {
  private toInsert: string[] = [];

  insert(toInsert: string | string[]): this {
    if (typeof toInsert === "string")
      this.toInsert = [toInsert];
    else
      this.toInsert = toInsert;
    return this;
  }

  execute(lines: string[]): string[] {
    const results = [];

    for (let lineNo = 0; lineNo <= lines.length; ++lineNo) {
      const context = new Context(lines, lineNo, lineNo);

      if (this.criterion.matches(context)) {
        const indent = context.getIndent();
        results.push(...this.toInsert.map(str => indent + str));
      }

      if (lineNo < lines.length) results.push(lines[lineNo]);
    }

    return results;
  }
}

type ReplaceValueLike = string | ((line: string) => string | null);

export class ReplaceRule extends Rule {
  private toReplace: ReplaceValueLike = '';

  replace(toSearch: PatternLike): this {
    this.criterion.add(Criterion.is(toSearch));
    return this;
  }

  with(toReplace: ReplaceValueLike): this {
    this.toReplace = toReplace;
    return this;
  }

  execute(lines: string[]): string[] {
    const results = [];

    for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
      const context = new Context(lines, lineNo, lineNo + 1);

      if (this.criterion.matches(context)) {
        const replaced = typeof this.toReplace === 'function' ? this.toReplace(lines[lineNo]) : this.toReplace;
        if (replaced !== null) {
          const indent = context.getIndent();
          results.push(indent + replaced);
        } 
      } else {
        results.push(lines[lineNo]);
      }
    }

    return results;
  }
}
