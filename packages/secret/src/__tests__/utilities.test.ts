import { Mock, SpiedFunction, UnknownFunction } from "jest-mock";
import { processFileWithPassword } from "../utilities";

import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { vi } from "vitest";

let mockLog: Mock<UnknownFunction>,
	spyLog: SpiedFunction<{
		(...data: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
	}>;
const password = "this is a skrt";
const contentToEncryptUTF8 = "⭐️ Hello World ⭐️";

describe("when testing with filesystem dependency", () => {
	it("should read and create files accordingly", async () => {
		const inputFile = path.join(os.tmpdir(), "dirname", "input.txt");
		const outputFile = path.join(os.tmpdir(), "dirname", "output.encoded");
		await fs.outputFile(inputFile, contentToEncryptUTF8);

		await processFileWithPassword({
			encode: true,
			input: inputFile,
			output: outputFile,
			password,
		});
		expect(fs.existsSync(outputFile)).toBe(true);
		await processFileWithPassword({
			encode: false,
			input: outputFile,
			output: inputFile,
			password,
		});
		expect(fs.existsSync(inputFile)).toBe(true);
		expect(fs.existsSync(outputFile)).toBe(true);
		expect(fs.readFileSync(inputFile, "utf8")).toBe(contentToEncryptUTF8);
	});
});

describe("when testing with filesystem dependency and logging side effects", () => {
	beforeEach(() => {
		mockLog = vi.fn();
		spyLog = vi.spyOn(console, "log").mockImplementation(mockLog);
	});
	afterEach(() => {
		spyLog.mockRestore();
	});
	it("should read and create files accordingly", async () => {
		const inputFile = path.join(os.tmpdir(), "dirname", "input.txt");
		const outputFile = path.join(os.tmpdir(), "dirname", "output.encoded");
		await fs.outputFile(inputFile, contentToEncryptUTF8);

		await processFileWithPassword({
			encode: true,
			input: inputFile,
			output: outputFile,
			password,
		});
		expect(fs.existsSync(outputFile)).toBe(true);
		await processFileWithPassword({
			encode: false,
			input: outputFile,
			password,
		});
		expect(mockLog).toHaveBeenCalledWith(contentToEncryptUTF8);

		expect(fs.existsSync(inputFile)).toBe(true);
		expect(fs.existsSync(outputFile)).toBe(true);
		expect(fs.readFileSync(outputFile, "utf8")).not.toBe(contentToEncryptUTF8);
	});
});
