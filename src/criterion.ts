import { Document, Context } from "./context";
import { PatternLike, testPattern, LineRange } from "./utility";

export abstract class Criterion {
  abstract matches(context: Context): boolean;

  static is(...args: ConstructorParameters<typeof CriterionIs>) {
    return new CriterionIs(...args);
  }

  static before(...args: ConstructorParameters<typeof CriterionBefore>) {
    return new CriterionBefore(...args);
  }

  static after(...args: ConstructorParameters<typeof CriterionAfter>) {
    return new CriterionAfter(...args);
  }

  static inside(...args: ConstructorParameters<typeof CriterionInside>) {
    return new CriterionInside(...args);
  }

  static custom(...args: ConstructorParameters<typeof CustomCriterion>) {
    return new CustomCriterion(...args);
  }

  static AND(criteria: Criterion[] = []) {
    return new CompoundCriterion(CompoundType.AND, criteria);
  }

  static OR(criteria: Criterion[] = []) {
    return new CompoundCriterion(CompoundType.OR, criteria);
  }

  static not(criterion: Criterion) {
    return new NotCriterion(criterion);
  }
}

export class CriterionIs extends Criterion {
  constructor(private pattern: PatternLike) {
    super();
  }

  matches(context: Context) {
    return testPattern(this.pattern,  context.self());
  }
}

export class CriterionBefore extends Criterion {
  constructor(private pattern: PatternLike) {
    super();
  }

  matches(context: Context) {
    return testPattern(this.pattern, context.next());
  }
}

export class CriterionAfter extends Criterion {
  constructor(private pattern: PatternLike) {
    super();
  }

  matches(context: Context) {
    return testPattern(this.pattern, context.prev());
  }
}

export class CriterionInside extends Criterion {
  private rangesCache: WeakMap<Document, LineRange[]> = new WeakMap();

  constructor(private begin: PatternLike, private end: PatternLike) {
    super();
  }

  private getRanges(document: Document): LineRange[] {
    const ranges: LineRange[] = [], lineCount = document.lineCount;

    let depth = 0, start = -1;

    for (let lineNo = 0; lineNo < lineCount; lineNo++) {
      const context = document.slice(lineNo, lineNo + 1);
      const line = context.self();

      if (testPattern(this.begin, line)) {
        if (depth++ === 0)
          start = lineNo + 1;
      } else if (depth > 0 && testPattern(this.end, line)) {
        if (--depth === 0)
          ranges.push([start, lineNo]);
      }
    }

    return ranges;
  }

  ranges(document: Document): LineRange[] {
    if (this.rangesCache.has(document))
      return this.rangesCache.get(document)!;

    const ranges = this.getRanges(document);
    this.rangesCache.set(document, ranges);
    return ranges;
  }

  matches(context: Context) {
    const ranges = this.ranges(context.document);
    const [searchL, searchR] = context.range;

    let l = 0, r = ranges.length;

    while (l < r) {
      const mid = (l + r) >> 1;
      const [curL, curR] = ranges[mid];
      if (searchR <= curL) {
        r = mid;
      } else if (searchL >= curR) {
        l = mid + 1;
      } else {
        return searchL >= curL && searchR <= curR;
      }
    }

    return false;
  }
}

type MatchesLike = Criterion["matches"];

export class CustomCriterion extends Criterion {
  constructor(private callback: MatchesLike) {
    super();
  }

  matches(context: Context) {
    return this.callback(context);
  }
}

enum CompoundType {
  AND = "and",
  OR = "or"
}

export class CompoundCriterion extends Criterion {
  constructor(private type: CompoundType, private children: Criterion[] = []) {
    super();
  }

  get length() {
    return this.children.length;
  }

  at(index: number) {
    return this.children[index];
  }

  add(criterion: Criterion): this {
    this.children.push(criterion);
    return this;
  }

  matches(context: Context): boolean {
    // for safety reasons, block empty criterion from matching
    if (!this.children.length) return false;

    switch (this.type) {
      case CompoundType.AND:
        return this.children.every(c => c.matches(context));

      case CompoundType.OR:
        return this.children.some(c => c.matches(context));
    }
  }
}

export class NotCriterion extends Criterion {
  constructor(private criterion: Criterion) {
    super();
  }

  matches(context: Context) {
    return !this.criterion.matches(context);
  }
}
