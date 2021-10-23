import { Context } from "./context";
import { StringOptional } from "./utility";

export type PatternLike = StringOptional | ((line: StringOptional) => boolean);

type MatchesLike = Criterion["matches"];

export abstract class Criterion {
  abstract matches(context: Context): boolean;

  static is(pattern: PatternLike): CriterionIs {
    return new CriterionIs(pattern);
  }

  static before(pattern: PatternLike): CriterionBefore {
    return new CriterionBefore(pattern);
  }

  static after(pattern: PatternLike): CriterionAfter {
    return new CriterionAfter(pattern);
  }

  static custom(callback: MatchesLike): CustomCriterion {
    return new CustomCriterion(callback);
  }

  static AND(criteria: Criterion[] = []): CompoundCriterion {
    return new CompoundCriterion(CompoundType.AND, criteria);
  }

  static OR(criteria: Criterion[] = []): CompoundCriterion {
    return new CompoundCriterion(CompoundType.OR, criteria);
  }

  static not(criterion: Criterion): NotCriterion {
    return new NotCriterion(criterion);
  }
}

function testPattern(pattern: PatternLike | null, value: () => StringOptional) {
  if (typeof pattern === 'function')
    return pattern(value());
  else
    return pattern === value();
}

export class CriterionIs extends Criterion {
  constructor(private pattern: PatternLike) {
    super();
  }

  matches(context: Context) {
    return testPattern(this.pattern, () => context.self());
  }
}

export class CriterionBefore extends Criterion {
  constructor(private pattern: PatternLike) {
    super();
  }

  matches(context: Context) {
    return testPattern(this.pattern, () => context.next());
  }
}

export class CriterionAfter extends Criterion {
  constructor(private pattern: PatternLike) {
    super();
  }

  matches(context: Context) {
    return testPattern(this.pattern, () => context.prev());
  }
}

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
