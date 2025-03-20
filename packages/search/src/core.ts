import { basename, extname, join, relative } from "node:path";
import { promisify } from "node:util";
import { Logger } from "@node-cli/logger";
import { Performance } from "@node-cli/perf";
import fs from "fs-extra";
import kleur from "kleur";
import plur from "plur";

import { GitIgnoreHandler } from "./gitIgnoreHandler.js";
import { minifyCss, minifyJs } from "./minifiers.js";
import {
	STR_TYPE_BOTH,
	STR_TYPE_DIRECTORY,
	STR_TYPE_FILE,
	checkPattern,
	formatLongListings,
	isBinaryFileExtension,
	printStatistics,
	runCommandOnNode,
	runGrepOnNode,
} from "./utilities.js";

const lstatAsync = promisify(fs.lstat);
const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const perf = new Performance();
const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});
const loggerInMemory = new Logger({
	inMemory: true,
});

export class Search {
	boring?: boolean;
	command?: string;
	displayHiddenFilesAndFolders?: boolean;
	displayLongListing?: boolean;
	displayStats?: boolean;
	grep?: RegExp;
	nodesList?: any[];
	path?: string;
	rePattern?: RegExp;
	totalDirFound?: number;
	totalDirScanned?: number;
	totalFileFound?: number;
	totalFileScanned?: number;
	type?: string;
	ignoreExtensions?: string[];
	ignoreFiles?: string[];
	ignoreFolders?: string[];
	printMode?: string;
	gitIgnoreHandler: GitIgnoreHandler;
	ignoreGitIgnore?: boolean;
	minifyForLLM?: boolean;

	constructor({
		boring,
		command,
		dot,
		grep,
		ignoreCase,
		short,
		path,
		pattern,
		stats,
		type,
		ignoreExtension,
		ignoreFile,
		ignoreFolder,
		printMode,
		ignoreGitIgnore,
		minifyForLLM,
	}: {
		boring?: boolean;
		command?: string;
		dot?: boolean;
		grep?: string | RegExp;
		ignoreCase?: boolean;
		short?: boolean;
		path?: string;
		pattern?: string;
		stats?: boolean;
		type?: string;
		ignoreExtension?: string[];
		ignoreFile?: string[];
		ignoreFolder?: string[];
		printMode?: string;
		ignoreGitIgnore?: boolean;
		minifyForLLM?: boolean;
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
		this.totalDirScanned = 0;
		this.totalFileScanned = 0;
		this.totalDirFound = 0;
		this.totalFileFound = 0;
		this.command = command ? command.trim() : undefined;
		this.ignoreExtensions =
			(ignoreExtension && ignoreExtension.map((ext) => ext.toLowerCase())) ||
			[];
		this.ignoreFiles = ignoreFile || [];
		this.ignoreFolders = ignoreFolder || [];
		this.printMode = printMode;
		this.ignoreGitIgnore = ignoreGitIgnore;
		this.minifyForLLM = minifyForLLM;
		this.gitIgnoreHandler = new GitIgnoreHandler();
		try {
			this.grep = grep ? new RegExp(grep, ignoreCase ? "gi" : "g") : undefined;
		} catch (error) {
			logger.error(error);
			process.exit(1);
		}
	}

	shouldIgnoreFolder(directory: string) {
		const folderName = basename(directory);
		// Check for exact folder name match
		if (this.ignoreFolders && this.ignoreFolders.includes(folderName)) {
			return true;
		}
		return false;
	}

	shouldIgnoreFile(filePath: string) {
		// First check if the file is in the ignoreFiles list
		const filename = basename(filePath);
		if (this.ignoreFiles && this.ignoreFiles.includes(filename)) {
			return true;
		}

		// Then check if the extension should be ignored
		if (!this.ignoreExtensions || this.ignoreExtensions.length === 0) {
			return false;
		}

		const extension = extname(filePath).toLowerCase().replace(/^\./, "");

		// Check for exact extension match
		if (this.ignoreExtensions.includes(extension)) {
			return true;
		}

		// Check for complex patterns like "min.js"
		for (const pattern of this.ignoreExtensions) {
			// Skip patterns that don't contain a dot
			if (!pattern.includes(".")) {
				continue;
			}

			// Check if the filename ends with the pattern
			if (filename.toLowerCase().endsWith(`.${pattern}`)) {
				return true;
			}
		}

		return false;
	}

	filterHidden(value: string[] | string) {
		if (this.displayHiddenFilesAndFolders) {
			return true;
		}
		return value[0] !== ".";
	}

	async start(returnResults = false) {
		if (this.displayStats) {
			perf.start();
		}
		await this.scanFileSystem([this.path]);
		const results = await this.postProcessResults(returnResults);

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
		return returnResults ? results : undefined;
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

			const isDirectory = stat && stat.isDirectory();
			const isFile = stat && stat.isFile();

			// Add this check to respect .gitignore patterns
			if (await this.shouldIgnoreByGitIgnore(node, isDirectory)) {
				continue;
			}

			if (isDirectory && !this.shouldIgnoreFolder(node)) {
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
			} else if (isFile) {
				// Skip files with ignored extensions
				if (this.shouldIgnoreFile(node)) {
					continue;
				}

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

	async minifyFileContent(filePath: string, content: string): Promise<string> {
		/* istanbul ignore if */
		if (!this.minifyForLLM || !content || content.length < 100) {
			return content;
		}

		const fileExtension = extname(filePath).toLowerCase().replace(/^\./, "");

		if (
			content &&
			content.length > 0 &&
			this.minifyForLLM &&
			(fileExtension.endsWith("js") ||
				fileExtension.endsWith("ts") ||
				/* istanbul ignore next */
				fileExtension.endsWith("jsx") ||
				/* istanbul ignore next */
				fileExtension.endsWith("tsx"))
		) {
			return minifyJs(content);
		}

		/* istanbul ignore next */
		if (
			content &&
			content.length > 0 &&
			this.minifyForLLM &&
			fileExtension.endsWith("css")
		) {
			return minifyCss(content);
		}

		return content;
	}

	async readFileContent(filePath: string): Promise<string> {
		try {
			// Check if it's a known binary extension
			/* istanbul ignore if */
			if (isBinaryFileExtension(filePath)) {
				return null;
			}
			const content = await readFileAsync(filePath, "utf8");
			return await this.minifyFileContent(filePath, content);
		} catch (_error) {
			/* istanbul ignore next */
			return null;
		}
	}

	async printFilesContent(returnResults: boolean) {
		const fileNodes = this.nodesList.filter(
			(node) => node.type === STR_TYPE_FILE,
		);

		if (this.printMode === "simple") {
			for (const node of fileNodes) {
				const relativePath = relative(this.path, node.name);
				if (returnResults) {
					loggerInMemory.log(`---\n./${relativePath}\n---`);
				} else {
					logger.log(`---\n./${relativePath}\n---`);
				}
				const content = await this.readFileContent(node.name);
				if (returnResults) {
					loggerInMemory.log(content);
				} else {
					logger.log(content);
				}
				// adding a new line after each file content except the last one
				if (node !== fileNodes[fileNodes.length - 1]) {
					if (returnResults) {
						loggerInMemory.log("");
					} else {
						logger.log("");
					}
				}
			}
		} else if (this.printMode === "xml") {
			if (returnResults) {
				loggerInMemory.log("<documents>");
			} else {
				logger.log("<documents>");
			}

			for (let i = 0; i < fileNodes.length; i++) {
				const node = fileNodes[i];
				const relativePath = relative(this.path, node.name);
				const content = await this.readFileContent(node.name);

				if (returnResults) {
					if (content) {
						loggerInMemory.log(`<document index="${i + 1}">`);
						loggerInMemory.log(`<source>./${relativePath}</source>`);
						loggerInMemory.log("<document_content>");
						loggerInMemory.log(content);
						loggerInMemory.log("</document_content>");
						loggerInMemory.log("</document>");
					}
				} else if (content) {
					logger.log(`<document index="${i + 1}">`);
					logger.log(`<source>./${relativePath}</source>`);
					logger.log("<document_content>");
					logger.log(content);
					logger.log("</document_content>");
					logger.log("</document>");
				}
			}

			if (returnResults) {
				loggerInMemory.log("</documents>");
			} else {
				logger.log("</documents>");
			}
		}
		const results = returnResults ? loggerInMemory.getMemoryLogs() : undefined;
		loggerInMemory.clearMemoryLogs();
		return results;
	}

	async shouldIgnoreByGitIgnore(
		nodePath: string,
		isDirectory: boolean,
	): Promise<boolean> {
		if (this.ignoreGitIgnore) {
			return false;
		}
		return this.gitIgnoreHandler.isIgnored(nodePath, isDirectory);
	}

	async postProcessResults(returnResults: boolean) {
		if (this.grep) {
			/**
			 * Resetting the number of files found, since we want to
			 * show how many matched the grep, not how many matched the
			 * pattern (in the file name).
			 */
			this.totalFileFound = 0;
		}

		// If printMode is enabled, handle file content printing and return
		if (this.printMode && ["simple", "xml"].includes(this.printMode)) {
			return await this.printFilesContent(returnResults);
		}

		/* istanbul ignore if */
		if (!this.boring) {
			logger.log();
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
				name = relative(this.path, node.name);

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
