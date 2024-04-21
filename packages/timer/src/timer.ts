#!/usr/bin/env node
/* istanbul ignore file */

import { config } from "./parse.js";
import { Timer } from "./utilities.js";

const timer = new Timer(config);
timer.start();
