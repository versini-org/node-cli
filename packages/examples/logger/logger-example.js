// ts-check

import { Logger } from "@node-cli/logger";

const logger = new Logger();
logger.timestamp = true;
logger.info("hello world");
logger.error("hello world");
