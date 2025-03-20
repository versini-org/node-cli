import fs from "node:fs";
import { extname } from "node:path";
import { Logger } from "@node-cli/logger";
import { RunResult, run } from "@node-cli/run";
import kleur from "kleur";
import prettyMilliseconds from "pretty-ms";

const BYTE_CHUNKS = 1000;
const DECIMAL = 10;
const LAST_THREE_ENTRIES = -3;
const MODE_GROUP_POS = 1;
const MODE_OWNER_POS = 0;
const MODE_WORD_POS = 2;
const OCTAL = 8;
export const STR_TYPE_DIRECTORY = "d";
export const STR_TYPE_FILE = "f";
export const STR_TYPE_BOTH = "both";
const PERMISSIONS_PREFIX = {
	[STR_TYPE_DIRECTORY]: "d",
	[STR_TYPE_FILE]: "-",
};
const BINARY_EXTENSIONS = [
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

const ownerNames = {
	0: "root",
};

const MONTHS = {
	0: "Jan",
	1: "Feb",
	2: "Mar",
	3: "Apr",
	4: "May",
	5: "Jun",
	6: "Jul",
	7: "Aug",
	8: "Sep",
	9: "Oct",
	10: "Nov",
	11: "Dec",
};

const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

export const getFileExtension = (filename: string): string => {
	return extname(filename).toLowerCase().replace(/^\./, "");
};

export const extractMode = (mode: number): string => {
	const modeDec = Number.parseInt(mode.toString(OCTAL), DECIMAL)
		.toString()
		.slice(LAST_THREE_ENTRIES);
	const modeOwner = modeDec.charAt(MODE_OWNER_POS);
	const modeGroup = modeDec.charAt(MODE_GROUP_POS);
	const modeWorld = modeDec.charAt(MODE_WORD_POS);
	const modes = {
		0: "---",
		1: "--x",
		2: "-w-",
		3: "-wx",
		4: "r--",
		5: "r-x",
		6: "rw-",
		7: "rwx",
	};
	return modes[modeOwner] + modes[modeGroup] + modes[modeWorld];
};

export const convertSize = (bytes: number): string => {
	const sizes = ["B", "K", "M", "G", "T"];
	const length = 5;
	let posttxt = 0;

	while (bytes >= BYTE_CHUNKS) {
		posttxt = posttxt + 1;
		bytes = bytes / BYTE_CHUNKS;
	}
	const string_ =
		Number.parseInt(bytes.toString(), DECIMAL).toFixed(0) + sizes[posttxt];
	return (
		Array.from({ length: length + 1 - string_.length }).join(" ") + string_
	);
};

export const convertDate = (mtime: Date): string => {
	const month = MONTHS[mtime.getMonth()];
	const date = `${mtime.getDate()}`.padStart(2, "0");
	const hours = `${mtime.getHours()}`.padStart(2, "0");
	const minutes = `${mtime.getMinutes()}`.padStart(2, "0");
	return `${month} ${date}  ${hours}:${minutes}`;
};

export const getOwnerNameFromId = async (
	uid: string | number,
): Promise<string | number> => {
	let result: RunResult;

	/* istanbul ignore else */
	if (ownerNames[uid]) {
		return ownerNames[uid];
	} else {
		try {
			result = await run(`id -nu ${uid}`);
			ownerNames[uid] = result.stdout;
			return result.stdout;
		} catch {
			// nothing to declare officer
			return `${uid}`;
		}
	}
};

export const formatLongListings = async (
	stat: { mtime: Date; mode: number; uid: string | number; size: number },
	type: string,
): Promise<{
	mdate: string;
	mode: string;
	owner: string;
	size: string;
}> => ({
	mdate: `${convertDate(stat.mtime)}`,
	mode: PERMISSIONS_PREFIX[type] + extractMode(stat.mode),
	owner: `${await getOwnerNameFromId(stat.uid)}`,
	size: `${convertSize(stat.size)}`,
});

export type Statistics = {
	duration?: number;
	totalDirScanned?: number;
	totalDirsFound?: number;
	totalFileScanned?: number;
	totalFilesFound?: number;
	type?: string;
	pattern?: boolean | RegExp;
	grep?: boolean | RegExp | string;
};
export const printStatistics = ({
	duration,
	totalDirScanned,
	totalDirsFound,
	totalFileScanned,
	totalFilesFound,
	type,
	pattern,
	grep,
}: Statistics) => {
	let message = `Total folders scanned: ${kleur.yellow(totalDirScanned)}\n`;
	message += `Total files scanned: ${kleur.yellow(totalFileScanned)}\n`;
	switch (type) {
		case STR_TYPE_DIRECTORY: {
			message += `Total folders matching: ${kleur.green(totalDirsFound)}\n`;
			break;
		}

		case STR_TYPE_FILE: {
			message += `Total files matching: ${kleur.green(totalFilesFound)}\n`;
			break;
		}

		default: {
			if (pattern) {
				message += `Total folders matching: ${kleur.green(totalDirsFound)}\n`;
				message += `Total files matching: ${kleur.green(totalFilesFound)}\n`;
			}
			break;
		}
	}

	message += `Duration: ${kleur.yellow(`${prettyMilliseconds(duration)}`)}`;
	if (!grep) {
		logger.log();
	}
	logger.printBox(message);
};

export const checkPattern = (
	rePattern: RegExp | undefined,
	string_: string,
): boolean | RegExpExecArray => {
	if (rePattern) {
		rePattern.lastIndex = 0;
		return rePattern.exec(string_);
	}
	return true;
};

export const runCommandOnNode = async (node: string, command: string) => {
	try {
		const { stdout } = await run(`${command} ${node}`);
		if (stdout) {
			logger.log(stdout);
		}
	} catch {
		// nothing to declare officer
	}
};

export type RunGrepOnNode = {
	results: (string | number)[];
	totalMatchingLines: number;
};
export const runGrepOnNode = async (
	node?: string,
	rePattern?: RegExp,
): Promise<RunGrepOnNode> => {
	try {
		const lines = [];
		let totalMatchingLines = 0;
		const buffer = fs.readFileSync(node, "utf8").split("\n");

		for (const [lineNumber, line] of buffer.entries()) {
			rePattern.lastIndex = 0;
			const result: (string | number)[] = rePattern.exec(line);
			if (!result) {
				continue;
			}
			totalMatchingLines++;
			if (lineNumber > 0) {
				lines.push(`${lineNumber}: ${kleur.grey(buffer[lineNumber - 1])}`);
			}
			lines.push(
				`${lineNumber + 1}: ${kleur.grey(
					line.replace(rePattern, kleur.black().bgYellow(result[0])),
				)}`,
				`${lineNumber + 2}: ${kleur.grey(buffer[lineNumber + 1])}`,
				"",
			);
		}
		return {
			results: lines.length > 0 ? lines : [],
			totalMatchingLines,
		};
	} catch (error) {
		/* istanbul ignore next */
		logger.error(error);
	}
};

export function isBinaryFileExtension(filePath: string): boolean {
	const ext = getFileExtension(filePath);
	// If there's no extension, assume it's binary
	if (!ext) {
		return true;
	}
	return BINARY_EXTENSIONS.includes(ext);
}
