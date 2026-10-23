const fs = require("fs"); global.window = {};
eval(fs.readFileSync(__dirname + "/../assets/samples.js", "utf8"));
const S = window.SAMPLES, P = require("../assets/parse.js"), QA = require("../assets/engine.js");
const ctx = { speller: QA.makeSpeller(fs.readFileSync(__dirname + "/../data/wordlist.txt", "utf8").split("\n")), extraWords: new Set(S.dictionary), linkStatus: S.linkStatus };
for (const k of ["web", "email"]) { const F = QA.runChecks(P.build(S[k]), ctx); console.log("==", k, F.length); F.forEach(f => console.log(f.id, f.category, f.title)); }
