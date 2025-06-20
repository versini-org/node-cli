#!/usr/bin/env node
/* v8 ignore start */

import { config } from "./parse.js";
import { Timer } from "./utilities.js";

const timer = new Timer(config);
timer.start();
/* v8 ignore stop */
