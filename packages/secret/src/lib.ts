import crypto from "node:crypto";
import { Logger } from "@node-cli/logger";

export const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

const HEX = "hex";
const UTF8 = "utf8";

const DEFAULT_CRYPTO_ALGO = "aes-256-ctr";
const DEFAULT_HASH_ALGO = "md5";
const DEFAULT_BYTES_FOR_IV = 16;
const DEFAULT_BYTES_FOR_SALT = 256;
const DEFAULT_SALT_SIZE_FOR_HASH = 16;

/**
 * Create an hexadecimal hash from a given string. The default
 * algorithm is md5 but it can be changed to anything that
 * crypto.createHash allows.
 * @param  {String} string            the string to hash
 * @param  {String} [algorithm='md5'] the algorithm to use or hashing
 * @return {String}                   the hashed string in hexa format
 */
export const createHash = (
	string: string,
	algorithm: string = DEFAULT_HASH_ALGO,
): string => {
	return crypto.createHash(algorithm).update(string, UTF8).digest(HEX);
};

/**
 * Creates a random SALT value using the crypto library.
 * @param  {Number} [bytes=256] the number of bytes to generate
 * @return {String}            the generated salt in hexa format
 */
export const createSalt = (bytes?: number): string => {
	bytes = bytes || DEFAULT_BYTES_FOR_SALT;
	return crypto.randomBytes(bytes).toString(HEX);
};

/**
 * Encrypts a string or a buffer using AES-256-CTR
 * algorithm.
 * @param  {String} password a unique password
 * @param  {String} data     a string to encrypt
 * @return {String} the encrypted data in hexa
 *   encoding, followed by a dollar sign ($) and by a
 *   unique random initialization vector.
 */
export const encrypt = (password: string, data: string): string => {
	// Ensure that the initialization vector (IV) is random.
	const iv = crypto.randomBytes(DEFAULT_BYTES_FOR_IV);
	// Hash the given password (result is always the same).
	const key = createHash(password);
	// Create a cipher.
	const cipher = crypto.createCipheriv(DEFAULT_CRYPTO_ALGO, key, iv);
	// Encrypt the data using the newly created cipher.
	const encrypted = cipher.update(data, UTF8, HEX) + cipher.final(HEX);
	/*
	 * Append the IV at the end of the encrypted data
	 * to reuse it for decryption (IV is not a key,
	 * it can be public).
	 */
	return `${encrypted}$${iv.toString(HEX)}`;
};

/**
 * Decrypts a string that was encrypted using the
 * AES-256-CRT algorithm via `encrypt`. It expects
 * the encrypted string to have the corresponding
 * initialization vector appended at the end, after
 * a dollar sign ($) - which was done via the
 * corresponding `encrypt` method.
 * @param  {String} password a unique password
 * @param  {String} data     a string to decrypt
 * @return {String}          the decrypted data
 */
export const decrypt = (password: string, data: string): string => {
	// Extract encrypted data and initialization vector (IV).
	const [encrypted, ivHex] = data.split("$");
	// Create a buffer out of the raw hex IV
	const iv = Buffer.from(ivHex, HEX);
	// Hash the given password (result is always the same).
	const hash = createHash(password);
	// Create a cipher.
	const decipher = crypto.createDecipheriv(DEFAULT_CRYPTO_ALGO, hash, iv);
	// Return the decrypted data using the newly created cipher.
	return decipher.update(encrypted, HEX, UTF8) + decipher.final("utf8");
};

/**
 * Function using the scrypt Password-Based Key Derivation method.
 * It generates a derived key of a given length from the given data
 * and salt.
 *
 * @param {String} data  the data to derive the key from
 * @param {String} salt  the salt to use
 * @returns {String} the derived key in hex format
 */
function generateScryptKey(data: string, salt: string): string {
	const encodedData = new TextEncoder().encode(data);
	const encodedSalt = new TextEncoder().encode(salt);
	const derivedKey = crypto.scryptSync(encodedData, encodedSalt, 64);
	return (derivedKey as Buffer).toString(HEX);
}

/**
 * Method to hash a password using the scrypt algorithm.
 *
 * @param {String} password  the password to hash
 * @param {String} salt      the salt to use
 * @returns {String} the hashed password
 */
export const hashPassword = (password: string, salt?: string): string => {
	const pepper = salt || createSalt(DEFAULT_SALT_SIZE_FOR_HASH);
	const key = generateScryptKey(password.normalize("NFKC"), pepper);
	return `${pepper}:${key}`;
};

/**
 * Method to verify a password against a hash using the scrypt algorithm.
 *
 * @param {String} password  the password to verify
 * @param {String} hash      the hash to verify against
 * @returns {Boolean} true if the password is correct, false otherwise
 */
export const verifyPassword = (password: string, hash: string): boolean => {
	const [salt, key] = hash.split(":");
	const keyBuffer = Buffer.from(key, HEX);

	const derivedKey = generateScryptKey(password.normalize("NFKC"), salt);
	const derivedKeyBuffer = Buffer.from(derivedKey, HEX);

	try {
		return crypto.timingSafeEqual(keyBuffer, derivedKeyBuffer);
	} catch (_error) {
		return false;
	}
};
