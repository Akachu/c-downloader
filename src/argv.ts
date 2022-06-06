import nopt from "nopt";
import path from "path";
import * as stream from "stream";

const Stream = stream.Stream;

const knownOpts = {
    "output": path,
    "root-url": [String, null],
    "max-folder-depth": [Number, null],
    "max-pool-size": [Number, null],
    "request-delay": [Number, null],
    "max-retry-count": [Number, null],
}

const shortHands = {
    "O": "--output",
    "U": "--root-url",
}

const parsedArgv = nopt(knownOpts, shortHands, process.argv, 2);

export default parsedArgv;
