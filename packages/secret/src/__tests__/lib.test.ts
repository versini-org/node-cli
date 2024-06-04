import { createHash, decrypt, encrypt } from "../lib";

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
			"c19952f971ab236afcb825e387e64c2194cf8cfbb814f0ac0cd85702a9d15696",
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
