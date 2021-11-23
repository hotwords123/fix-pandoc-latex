
import fs = require("fs");
import pathlib = require("path");
import os = require("os");

import Reviser from "./reviser";
import { Rule } from "./rule";
import { Criterion } from "./criterion";
import { FixFigureRule } from "./fix-figure";
import { Document } from "./context";
import { splitLines } from "./utility";

const srcFile = pathlib.resolve(process.argv[2] || './homework.tex');

const content = fs.readFileSync(srcFile, 'utf-8');
const lines = splitLines(content);

const reviser = new Reviser();

reviser.addRules([
  // add chinese support
  Rule.insert("\\usepackage[UTF8]{ctex} % add chinese support")
      .after("\\usepackage[utf8]{inputenc}"),

  // adjust page margin
  Rule.insert([
    "% adjust page margin",
    "\\usepackage{geometry}",
    "\\geometry{a4paper,scale=0.9}",
    "",
  ]).before("\\date{}"),

  // append pdf if exists
  Rule.insert([
    "\\usepackage{pdfpages}"
  ]).before("\\begin{document}"),
  Rule.insert([
    "\\IfFileExists{./append.pdf}{\\includepdf{./append.pdf}}{}"
  ]).before("\\end{document}"),

  // add polyfills
  Rule.insert([
    "",
    "% polyfill",
    "\\newcommand{\\N}{\\mathbb N}",
    "\\newcommand{\\Z}{\\mathbb Z}",
    "\\newcommand{\\Q}{\\mathbb Q}",
    "\\newcommand{\\R}{\\mathbb R}",
    "\\newcommand{\\C}{\\mathbb C}",
//  "\\newcommand{\\lt}{<}",
//  "\\newcommand{\\gt}{>}",
    ]).after("\\date{}"),

  // fix \d and \i already defined
  Rule.replace("\\newcommand{\\d}{{\\rm d}}")
      .with("\\renewcommand{\\d}{{\\rm d}}"),
  Rule.replace("\\newcommand{\\i}{{\\rm i}}")
      .with("\\renewcommand{\\i}{{\\rm i}}"),

  // fix blank lines inside equations
  Rule.replace("")
      .with(null)
      .either(
        Criterion.inside("\\begin{aligned}", "\\end{aligned}"),
        Criterion.inside(line => !!line && line.startsWith("\\begin{array}"), "\\end{array}"),
        Criterion.inside(
          line => !!line && line.startsWith("\\["),
          line => !!line && line.endsWith("\\]")
        )
      ),

  // fix figures
  FixFigureRule.fromPath(pathlib.join(pathlib.dirname(srcFile), 'figure.tex')),

  // fix `aligned` and `array` not working outside math mode
  Rule.replace("\\begin{aligned}").with("\\[\\begin{aligned}"),
  Rule.replace("\\end{aligned}").with("\\end{aligned}\\]"),
  Rule.insert("\\[")
      .before(line => !!line && line.startsWith("\\begin{array}"))
      .after(line => !line),
  Rule.insert("\\]")
      .after("\\end{array}")
      .before(line => !line),

  // make tables center-aligned
  Rule.replace(line => !!line && line.startsWith("\\begin{longtable}[]"))
      .with(line => line.replace(/@\{\}(l+)@\{\}/, (str, p1) => '@{}' + 'c'.repeat(p1.length) + '@{}')),

  // adjust horizontal line style
  Rule.replace(line => !!line && line.startsWith("\\begin{center}\\rule"))
      .with("\\begin{center}\\rule{\\linewidth}{0.05pt}\\end{center}"),

  // prevent unwanted new segment
  Rule.replace("")
      .with("%")
      .either(
        Criterion.before(line => !!line && line.startsWith("\\[")),
        Criterion.AND([
          Criterion.OR([
            Criterion.after("\\end{longtable}"),
            Criterion.after(line => !!line && line.endsWith("\\]")),
          ]),
          Criterion.NOT(Criterion.before(line => !!line && line.startsWith("\\hypertarget")))
        ]),
      ),
]);

const results = reviser.process(lines);

fs.writeFileSync(srcFile.replace('.tex', '.out.tex'), results.join(os.EOL), 'utf-8');
