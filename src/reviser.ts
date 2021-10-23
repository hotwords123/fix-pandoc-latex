import { Rule } from "./rule";

export default class Reviser {
  private rules: Rule[] = [];

  addRule(rule: Rule): this {
    this.rules.push(rule);
    return this;
  }

  addRules(...args: (Rule | Rule[])[]): this {
    this.rules.push(...args.flat());
    return this;
  }

  process(lines: string[]): string[] {
    for (const rule of this.rules)
      lines = rule.execute(lines);
    return lines;
  }
}
