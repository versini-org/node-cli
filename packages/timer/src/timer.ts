#!/usr/bin/env node
/* istanbul ignore file */

import { Timer } from "./utilities.js";
import { config } from "./parse.js";

const timer = new Timer(config);
timer.start();
