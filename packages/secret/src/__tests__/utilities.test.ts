import { Mock, SpiedFunction, UnknownFunction } from "jest-mock";
import {
	createHash,
	decrypt,
	encrypt,
	processFileWithPassword,
} from "../utilities";

import fs from "fs-extra";
import { jest } from "@jest/globals";
import os from "node:os";
import path from "node:path";

let mockLog: Mock<UnknownFunction>,
	spyLog: SpiedFunction<{
		(...data: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
	}>;
const password = "this is a skrt";
const contentToEncrypt = "Hello World";
const contentToEncryptUTF8 = "⭐️ Hello World ⭐️";

describe("when testing for individual utilities with no logging side-effects", () => {
	it("should create an hexadecimal hash from a given string with md5 as a default.", async () => {
		const result = createHash(password);
		expect(result).toEqual("0f2258436205eec8e11e1bb8d9a967c4");
	});

	it("should create an hexadecimal hash from a given string with sha256.", async () => {
		const result = createHash(password, "sha256");
		expect(result).toEqual(
			"c19952f971ab236afcb825e387e64c2194cf8cfbb814f0ac0cd85702a9d15696"
		);
	});

	it("should encrypt and decrypt a simple string", async () => {
		const encrypted = encrypt(password, contentToEncrypt);
		const decrypted = decrypt(password, encrypted);
		expect(decrypted).toBe(contentToEncrypt);
	});

	it("should encrypt and decrypt a UTF8 string", async () => {
		const encrypted = encrypt(password, contentToEncryptUTF8);
		const decrypted = decrypt(password, encrypted);
		expect(decrypted).toBe(contentToEncryptUTF8);
	});
});

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
		mockLog = jest.fn();
		spyLog = jest.spyOn(console, "log").mockImplementation(mockLog);
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
