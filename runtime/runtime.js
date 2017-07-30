"use strict";
let Compiler = require("../compiler/compiler").Compiler;

class RT {

    constructor() {
        this.compiler = new Compiler();
    }

    loop(x) {
    }

    run(input) {
        this.compiler.input = input;
        this.compiler.compile();
        setTimeout(() => this.run(),0);
    }
}

module.exports.RT = RT;