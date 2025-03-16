import { basename, join, relative } from "node:path";
import {
	STR_TYPE_BOTH,
	STR_TYPE_DIRECTORY,
	STR_TYPE_FILE,
	checkPattern,
	formatLongListings,
	printStatistics,
	runCommandOnNode,
	runGrepOnNode,
} from "./utilities.js";

import { promisify } from "node:util";
import { Logger } from "@node-cli/logger";
import { Performance } from "@node-cli/perf";
import fs from "fs-extra";
import kleur from "kleur";
import plur from "plur";

const lstatAsync = promisify(fs.lstat);
const readdirAsync = promisify(fs.readdir);
const perf = new Performance();
const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

export class Search {
	boring?: boolean;
	command?: string;
	displayHiddenFilesAndFolders?: boolean;
	displayLongListing?: boolean;
	displayStats?: boolean;
	foldersBlacklist?: RegExp;
	grep?: RegExp;
	nodesList?: any[];
	path?: string;
	rePattern?: RegExp;
	totalDirFound?: number;
	totalDirScanned?: number;
	totalFileFound?: number;
	totalFileScanned?: number;
	type?: string;

	constructor({
		boring,
		command,
		dot,
		foldersBlacklist,
		grep,
		ignoreCase,
		short,
		path,
		pattern,
		stats,
		type,
	}: {
		boring?: boolean;
		command?: string;
		dot?: boolean;
		foldersBlacklist?: RegExp;
		grep?: string | RegExp;
		ignoreCase?: boolean;
		short?: boolean;
		path?: string;
		pattern?: string;
		stats?: boolean;
		type?: string;
	}) {
		this.path = path;
		this.rePattern = pattern
			? new RegExp(pattern, ignoreCase ? "i" : "")
			: undefined;
		this.type = type || STR_TYPE_BOTH;
		this.boring = boring;
		kleur.enabled = !boring;
		this.displayLongListing = !short;
		this.displayStats = stats;
		this.displayHiddenFilesAndFolders = dot;
		this.nodesList = [];
		this.foldersBlacklist = foldersBlacklist;
		this.totalDirScanned = 0;
		this.totalFileScanned = 0;
		this.totalDirFound = 0;
		this.totalFileFound = 0;
		this.command = command ? command.trim() : undefined;
		try {
			this.grep = grep ? new RegExp(grep, ignoreCase ? "gi" : "g") : undefined;
		} catch (error) {
			logger.error(error);
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(1);
		}
	}

	ignoreFolders(directory: string) {
		this.foldersBlacklist.lastIndex = 0;
		return this.foldersBlacklist.test(basename(directory));
	}

	filterHidden(value: string[] | string) {
		if (this.displayHiddenFilesAndFolders) {
			return true;
		}
		return value[0] !== ".";
	}

	async start() {
		if (this.displayStats) {
			perf.start();
		}
		await this.scanFileSystem([this.path]);
		await this.postProcessResults();

		if (this.displayStats) {
			perf.stop();
			printStatistics({
				duration: perf.results.duration,
				grep: this.grep,
				pattern: this.rePattern,
				totalDirScanned: this.totalDirScanned,
				totalDirsFound: this.totalDirFound,
				totalFileScanned: this.totalFileScanned,
				totalFilesFound: this.totalFileFound,
				type: this.type,
			});
		}
	}

	async scanFileSystem(nodes: string[]) {
		for (const node of nodes) {
			let result: boolean | RegExpExecArray,
				files: string[],
				shortname: string,
				stat: fs.Stats;
			try {
				stat = await lstatAsync(node);
			} catch {
				// ignore read permission denied errors silently...
			}

			if (stat && stat.isDirectory() && !this.ignoreFolders(node)) {
				this.totalDirScanned++;

				result = checkPattern(this.rePattern, node);
				if (result) {
					this.totalDirFound++;
					this.nodesList.push({
						command: this.command,
						match: result,
						name: node,
						stat,
						type: STR_TYPE_DIRECTORY,
					});
				}

				try {
					files = await readdirAsync(node);
					await this.scanFileSystem(
						files
							.filter((element) => this.filterHidden(element))
							.map(function (file) {
								return join(node, file);
							}),
					);
				} catch {
					// nothing to declare
				}
			} else if (stat && stat.isFile()) {
				this.totalFileScanned++;
				shortname = basename(node);
				const patternResult = checkPattern(this.rePattern, shortname);
				if (patternResult) {
					this.totalFileFound++;
					this.nodesList.push({
						command: this.command,
						match: patternResult[0],
						name: node,
						stat,
						type: STR_TYPE_FILE,
					});
				}
			}
		}
	}

	async postProcessResults() {
		/* istanbul ignore if */
		if (!this.boring) {
			logger.log();
		}

		if (this.grep) {
			/**
			 * Resetting the number of files found, since we want to
			 * show how many matched the grep, not how many matched the
			 * pattern (in the file name).
			 */
			this.totalFileFound = 0;
		}

		for (const node of this.nodesList) {
			if (
				(this.type === STR_TYPE_FILE && node.type === STR_TYPE_FILE) ||
				(this.type === STR_TYPE_DIRECTORY &&
					node.type === STR_TYPE_DIRECTORY) ||
				this.type === STR_TYPE_BOTH
			) {
				let list: {
						group?: string;
						mdate?: string;
						mode?: string;
						owner?: string;
						size?: string;
					} = {
						group: "",
						mdate: "",
						mode: "",
						owner: "",
						size: "",
					},
					name: string,
					separator: string = "";

				/* istanbul ignore if */
				if (this.displayLongListing) {
					list = await formatLongListings(node.stat, node.type);
					separator = "\t";
				}

				const color = node.type === STR_TYPE_FILE ? kleur.gray : kleur.blue;
				name = relative(process.cwd(), node.name);

				if (node.match) {
					const matchStr = String(node.match); // Ensure match is a string
					const match = new RegExp(matchStr, "g");
					const highlightedMatch = kleur.black().bgYellow(matchStr);
					name = color(name.replace(match, highlightedMatch));
				} else {
					name = color(name);
				}

				if (this.grep && node.type === STR_TYPE_FILE) {
					const { totalMatchingLines, results } = await runGrepOnNode(
						node.name,
						this.grep,
					);
					/* istanbul ignore else */
					if (totalMatchingLines) {
						this.totalFileFound++;
						const occurrences = plur("occurrence", totalMatchingLines);
						logger.log(
							` %s${separator}%s${separator}%s${separator}%s${separator}%s`,
							list.mode.trim(),
							list.owner.trim(),
							list.size.trim(),
							list.mdate,
							name,
							`(${kleur.white(totalMatchingLines)} ${occurrences})`,
						);
						logger.log(`${results.join("\n")}\n`);
					}
				} else {
					/* istanbul ignore next */
					if (!this.grep) {
						logger.log(
							` %s${separator}%s${separator}%s${separator}%s${separator}%s`,
							list.mode.trim(),
							list.owner.trim(),
							list.size.trim(),
							list.mdate,
							name,
						);
						if (node.command) {
							await runCommandOnNode(node.name, node.command);
						}
					}
				}
			}
		}
	}
}
