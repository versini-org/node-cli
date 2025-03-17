import { basename, extname, join, relative } from "node:path";

import { GitIgnoreHandler } from "./gitIgnoreHandler.js";
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
const readFileAsync = promisify(fs.readFile);
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
	ignoreExtensions?: string[];
	ignoreFiles?: string[];
	printMode?: string;
	gitIgnoreHandler: GitIgnoreHandler;
	ignoreGitIgnore?: boolean;

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
		ignoreExtension,
		ignoreFile,
		printMode,
		ignoreGitIgnore,
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
		ignoreExtension?: string[];
		ignoreFile?: string[];
		printMode?: string;
		ignoreGitIgnore?: boolean;
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
		this.ignoreExtensions = ignoreExtension.map((ext) => ext.toLowerCase());
		this.ignoreFiles = ignoreFile || [];
		this.printMode = printMode;
		this.ignoreGitIgnore = ignoreGitIgnore;
		this.gitIgnoreHandler = new GitIgnoreHandler();
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

	isBinaryFileExtension(filePath: string): boolean {
		const ext = extname(filePath).toLowerCase().replace(/^\./, "");

		// If there's no extension, assume it's binary
		/* istanbul ignore if */
		if (!ext) {
			return true;
		}

		const binaryExtensions = [
			// Executables and compiled code
			"exe",
			"dll",
			"so",
			"dylib",
			"bin",
			"obj",
			"o",
			// Compressed files
			"zip",
			"tar",
			"gz",
			"rar",
			"7z",
			"jar",
			"war",
			// Media files
			"jpg",
			"jpeg",
			"png",
			"gif",
			"bmp",
			"ico",
			"tif",
			"tiff",
			"mp3",
			"mp4",
			"avi",
			"mov",
			"wmv",
			"flv",
			"wav",
			"ogg",
			// Document formats
			"pdf",
			"doc",
			"docx",
			"xls",
			"xlsx",
			"ppt",
			"pptx",
			// Database files
			"db",
			"sqlite",
			"mdb",
			// Other binary formats
			"class",
			"pyc",
			"pyd",
			"pyo",
			"woff",
			"woff2",
			"ttf",
			"otf",
		];

		return binaryExtensions.includes(ext);
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

			if (isDirectory && !this.ignoreFolders(node)) {
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

	async readFileContent(filePath: string): Promise<string> {
		try {
			// Check if it's a known binary extension
			/* istanbul ignore if */
			if (this.isBinaryFileExtension(filePath)) {
				return "[Binary file]";
			}
			const content = await readFileAsync(filePath, "utf8");
			return content;
		} catch (error) {
			/* istanbul ignore next */
			return `Error reading file: ${error.message}`;
		}
	}

	async printFilesContent(returnResults: boolean) {
		const fileNodes = this.nodesList.filter(
			(node) => node.type === STR_TYPE_FILE,
		);

		let results = "";
		if (this.printMode === "simple") {
			for (const node of fileNodes) {
				const relativePath = relative(this.path, node.name);
				if (returnResults) {
					results += `---\n./${relativePath}\n---\n`;
				} else {
					logger.log(`---\n./${relativePath}\n---`);
				}
				const content = await this.readFileContent(node.name);
				if (returnResults) {
					results += `${content}\n`;
				} else {
					logger.log(content);
				}
				// adding a new line after each file content except the last one
				if (node !== fileNodes[fileNodes.length - 1]) {
					if (returnResults) {
						results += "\n";
					} else {
						logger.log("");
					}
				}
			}
		} else if (this.printMode === "xml") {
			if (returnResults) {
				results += "<documents>\n";
			} else {
				logger.log("<documents>");
			}

			for (let i = 0; i < fileNodes.length; i++) {
				const node = fileNodes[i];
				const relativePath = relative(this.path, node.name);
				const content = await this.readFileContent(node.name);

				if (returnResults) {
					results += `<document index="${i + 1}">\n`;
					results += `<source>./${relativePath}</source>\n`;
					results += "<document_content>\n";
					results += `${content}\n`;
					results += "</document_content>\n";
					results += "</document>\n";
				} else {
					logger.log(`<document index="${i + 1}">`);
					logger.log(`<source>./${relativePath}</source>`);
					logger.log("<document_content>");
					logger.log(content);
					logger.log("</document_content>");
					logger.log("</document>");
				}
			}

			if (returnResults) {
				results += "</documents>";
			} else {
				logger.log("</documents>");
			}
		}
		return results;
	}

	async shouldIgnoreByGitIgnore(
		nodePath: string,
		isDirectory: boolean,
	): Promise<boolean> {
		/* istanbul ignore if */
		if (this.ignoreGitIgnore) {
			return false;
		}
		return this.gitIgnoreHandler.isIgnored(nodePath, isDirectory);
	}

	async postProcessResults(returnResults: boolean) {
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

		// If printMode is enabled, handle file content printing and return
		if (this.printMode && ["simple", "xml"].includes(this.printMode)) {
			return await this.printFilesContent(returnResults);
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
