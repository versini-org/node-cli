#!/usr/bin/env node
/* v8 ignore start */
import fs from "node:fs";
import path from "node:path";
import kleur from "kleur";
import { expandGlobs } from "./glob.js";
import { diffLines, logger, parseAndTransformComments } from "./lib.js";
import { config } from "./parse.js";

function exit(code: number) {
	process.exit(code);
}

function readFileSafe(file: string): string | undefined {
	try {
		return fs.readFileSync(file, "utf8");
	} catch {
		logger.error(`File not found: ${file}`);
		return undefined;
	}
}

const width = Number(config.flags.width || 80);
const wrapLineComments = config.flags.noLineWrap !== true;
const mergeLineComments = config.flags.mergeLineComments === true;

let fileArgs: string[] = Object.values(config.parameters || {});
// Expand simple glob patterns (*, **, ?) per PRD
if (fileArgs.length > 0) {
	fileArgs = expandGlobs(fileArgs);
}
const files: string[] = fileArgs;
if (!files.length) {
	logger.printErrorsAndExit?.(["No matching files found"], 1);
}

let anyChanges = false;

for (const file of files) {
	const source = readFileSafe(file);
	if (source === undefined) {
		continue;
	}
	const result = parseAndTransformComments(source, {
		width,
		wrapLineComments,
		mergeLineComments,
	});
	if (config.flags.dryRun) {
		if (result.changed) {
			anyChanges = true;
			logger.info(`Changes in ${file}`);
			const d = diffLines(source, result.transformed);
			if (d) {
				process.stdout.write(kleur.gray(`\n${d}\n\n`));
			}
		} else {
			logger.info(`No changes needed in ${file}`);
		}
	} else if (config.flags.stdout) {
		process.stdout.write(result.transformed);
	} else if (result.changed) {
		fs.writeFileSync(file, result.transformed, "utf8");
		logger.info(
			`Reflowed ${path.basename(file)}${mergeLineComments ? " merged" : ""}${wrapLineComments ? " wrapped" : ""}`,
		);
	} else {
		logger.info(`Unchanged ${file}`);
	}
}

if (config.flags.dryRun) {
	exit(anyChanges ? 1 : 0);
}
/* v8 ignore stop */
