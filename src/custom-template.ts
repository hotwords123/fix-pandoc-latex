import fs = require("fs");
import pathlib = require("path");
import os = require("os");
import { Context, Document } from "./context";
import { Criterion } from "./criterion";
import { ReplaceRule } from "./rule";
import { splitLines, StringOptional } from "./utility";

interface CustomTemplate {
  name: string;
  lines: string[];
}

export class CustomTemplateRule extends ReplaceRule {
  static reTemplate = /^@@(.+)@@$/;

  constructor(private templates: readonly CustomTemplate[]) {
    super();
    this.replace(line => !!line?.match(CustomTemplateRule.reTemplate))
      .with(line => this.replaceHandler(line));
  }

  static fromDir(dir: string): CustomTemplateRule {
    let templates: CustomTemplate[] = [];
    for (let file of fs.readdirSync(dir)) {
      if (file.endsWith(".tex")) {
        let name = file.slice(0, -4);
        let path = pathlib.join(dir, file);
        let lines = splitLines(fs.readFileSync(path, "utf-8"));
        templates.push({ name, lines });
        console.log(`found template "${name}"`);
      }
    }
    return new CustomTemplateRule(templates);
  }

  replaceHandler(line: string): string {
    let temp = line.match(CustomTemplateRule.reTemplate);
    if (temp) {
      let templateName = temp[1];
      let template = this.templates.find(x => x.name === templateName);
      if (template) {
        console.log(`applying template "${templateName}"`);
        return template.lines.join(os.EOL);
      } else {
        console.warn(`template "${templateName}" not found`);
      }
    }
    return line;
  }
}
