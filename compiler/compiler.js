"use strict"

// First add the reserved tokens
let reserved = {
    "::": {
        type: "MethodDec",
        value: "::"
    },
    ":": {
        type: "Colon",
        value: ":"
    },
    ";": {
        type: "Semicolon",
        value: ";"
    },
    ",": {
        type:  "Comma",
        value: ",",
    },
    "\n": {
        type:  "Newline",
        value: "\n",
    },
    "|": {	
        type:  "Pipe",
        value: "|",
    },
    "|>": {
        type:  "Cascade",
        value: "|>",
    },
    "^": {
        type:  "Return",
        value: "^",
    },
    "=": {
        type:  "Eq",
        value: "=",
    },
    ":=": {
        type:  "Assign",
        value: ":=",
    },
    "(": {
        type:  "Lparen",
        value: "(",
    },
    ")": {
        type:  "Rparen",
        value: ")",
    },
    "[": {
        type:  "Lbracket",
        value: "[",
    },
    "]": {
        type:  "Rbracket",
        value: "]",
    },
    "{": {
        type: "Lbrace",
        value: "{"
    },
    "}": {
        type: "Rbrace",
        value: "}"
    },
    "\t": {
        type:  "Tab",
        value: "\t",
    },
}

class Compiler {
    constructor(input) {
        this.tokens = [];
        this.tokenPos = 0;
        this.ast = Object.create(null);
        this.input = input;
    }

    clear() {
        this.tokens = []
        this.ast = Object.create(null);
        this.tokenPos = 0;
    }

    compile() {
        this.lexer();
        this.parser();
        console.log(JSON.stringify(this.ast));
    }

    lexer() {

        // Index of input
        let current = 0;

        // Total length of inputh
        let len = this.input.length;

        // Handy delimiters
        let NUMBERS = /[0-9]/;
        let WHITESPACE = ' ';

        // Test for delimeters that require some closure
        let testDelim = (char) => {
            if (NUMBERS.test(char)) {
                return {
                    fn: (char) => NUMBERS.test(char),
                    type: 'Number',
                    pre: (c) => c,
                    post: (c) => c,
                };
            }
            else if (char === "\"") {
                return {
                    fn: (char) => char !== "\"",
                    type: "Comment",
                    pre: (c) => c + 1,
                    post: (c) => c + 1
                };
            }
            else if  (char === "'") {
                return {
                    fn: (char) => char !== "'",
                    type: "String",
                    pre: (c) => c + 1,
                    post: (c) => c + 1
                };
            }
            else { return false; }
        }

        let checkReserved = (char) => {
            let peek = char + this.input[current + 1];
            if (reserved[char] !== undefined) {
                return true;
            }
            else if (reserved[peek !== undefined]) {
                return true;
            }
            else {
                return false;
            }
        }

        // Loop over input until finished 
        while (current < len) {
            let char = this.input[current]

            if (current + 1 < len) {
                let peek = reserved[char + this.input[current + 1]];
                if (peek !== undefined) {
                    this.tokens.push(peek);
                    current += 2;
                    continue;
                }
            } 

            let peek = reserved[char];
            if (peek !== undefined) {
                this.tokens.push(peek);
                current++;
                continue;
            }

            let val = testDelim(char);

            if (val !== false) {
                let value = "";
                current = val.pre(current);
                char = this.input[current]

                while (val.fn(char)) {
                    value += char;
                    current++;
                    char = this.input[current];
                }

                this.tokens.push({
                    type: val.type,
                    value: value
                });

                current = val.post(current);
                continue;
            }

            // If there is a space after a newline treat it as a tab
            console.log(current);
            if (char === WHITESPACE && current > 1) {
                console.log(char, "HERE")
                if (this.tokens[this.tokens.length-1].type === "Newline") {
                    this.tokens.push({
                        type: "Tab",
                        value: "\t"
                    });
                    current++;
                    continue;
                }
            }

            if (char !== WHITESPACE) {
                let value = "";
                while (char !== WHITESPACE && char !== "\t") {
                    if (checkReserved(char)) {
                        current --
                        break;
                    }
                    value += char;
                    current++;
                    char = this.input[current];
                }
                this.tokens.push({
                    type: "Ident",
                    value: value
                });
                current++;
                continue;
            }
            current++;
        }

        this.tokens.push({
            type: "EOF",
            value: ""
        });
    }

    parser() {

        // Create the index
        let current = 0;

        // A couple of parsing flags
        let parserInBody = false;
        let inMethodParams = false;
        let expressionStack = []

        // Traversing function
        let walk = () => {

            // Get the token
            let token = this.tokens[current];
            if (token == null) {
                console.log(this.ast);
                throw("EOF Exception");
            }
            
            // If this is an unimportant tab skip it
            while (token.type === 'Tab') {
                current++;
                token = this.tokens[current];
            }

            // We ignore new lines outside of a method declaration
            if (token.type === 'Newline' && !parserInBody) {
                while (token.type === 'Newline') {
                    current++;
                    token = this.tokens[current];
                }
            }

            if (token.type === "EOF") {
                current++;
                return null;
            }

            if (current + 2 < this.tokens.length && this.tokens[current+1].type === "MethodDec") {
                parserInBody = true;

                let newNode = {
                    type: "MethodDec",
                    name: token.value,
                    value: this.tokens[current+2].value,
                    params: [],
                    body: []
                };

                current += 2;

                token = this.tokens[current];
                inMethodParams = true;

                while (token.type !== "Newline") {
                    newNode.params.push(walk());
                    token = this.tokens[current];
                }

                inMethodParams = false;
                
                while (token.type !== "EOF") {
                    newNode.body.push(walk());
                    token = this.tokens[current];

                    console.log(token);

                    if (token.type === "Newline") {
                        while (token.type === "Newline") {
                            current++;
                            token = this.tokens[current];
                        }

                        if (token.type !== "Tab") {
                            break;
                        }
                    }
                }
                console.log(token, "OUT");

                parserInBody = false;
                return newNode;
            }

            // Skip extraneous tokens
            while (token.type === 'Tab' || token.type === "Newline") {
                current++;
                token = this.tokens[current];
            }

            // Return expression
            if (token.type === "Return") {
                let newNode = {
                    type: "ReturnExpression",
                    body: []
                }

                expressionStack.push(expressionStack.length);
                current++;
                token = this.tokens[current];
                while (token.type !== "Semicolon") {
                    newNode.body.push(walk());
                    token = this.tokens[current];                    
                }
                console.log(token);
                current++;
                console.log(this.tokens[current]);
                expressionStack.pop();
                return newNode;
            }

            // Assign Statement
            if (this.tokens[current+1].type === "Assign") {

                let newNode = {
                    type: "AssignExpression",
                    name: token.value,
                    body: []
                };

                current += 2;

                expressionStack.push(expressionStack.length);
                token = this.tokens[current];
                while (token.type !== "Semicolon") {
                    newNode.body.push(walk());
                    token = this.tokens[current];
                }
                current++;
                expressionStack.pop();
                return newNode;
            }



            // Instance declarations
            if (token.type === "Pipe") {
                current++;
                token = this.tokens[current];

                let newNode = {
                    type: "InstanceDecs",
                    body: []
                };

                expressionStack.push(expressionStack.length);

                while (token.type !== "Pipe") {
                    newNode.body.push(walk());
                    token = this.tokens[current];

                    while (token.type === "Tab" || token.type === "Newline") {
                        current++;
                        token = this.tokens[current];
                    }
                }

                expressionStack.pop();
                current++;
                return newNode;
            }
        

            // If there is no return, assign, or instance declarations, 
            // create a regular expression node
            if (expressionStack.length === 0 && !inMethodParams) {
                expressionStack.push(expressionStack.length);
                    let newNode = {
                    type: "Expression",
                    body: []
                };

                while (token.type !== "Semicolon") {
                    newNode.body.push(walk());
                    token = this.tokens[current];
                }

                expressionStack.pop();

                current++;

                return newNode;
            }

            // Block Closures
            if (token.type === "Lbracket") {
                current++;
                let newNode = {
                    type: "BlockClosure",
                    body: []
                };

                // Here we copy the expression stack so we can create a new one
                // Specifically for this block
                let tempHolder = expressionStack.slice(0);
                expressionStack = []

                while (token.type !== "Rbracket") {
                    newNode.body.push(walk());
                    token = this.tokens[current];

                    while (token.type === "Tab" || token.type === "Newline") {
                        current++;
                        token = this.tokens[current];
                    }
                }

                // Now return the old expression stack to continue on
                expressionStack = tempHolder.slice(0);
                return newNode;
            }

            // Paren blocks
            if (token.type === "Lparen") {
                current++;
                let newNode = {
                    type: "ParenBlock",
                    body: []
                };

                while (token.type !== "Rparen") {
                    newNode.body.push(walk());
                    token = this.tokens[current];

                    while (token.type === "Tab" || token.type === "Newline") {
                        current++;
                        token = this.tokens[current];
                    }                    
                }

                return newNode;
            }

            // Array literals
            if (token.type === "LBrace") {
                current++;
                let newNode = {
                    type: "ArrayLiteral",
                    body: []
                };

                while (token.type !== "Rbrace") {
                    newNode.body.push(walk());
                    token = this.tokens[current];
                    current++;

                    while (token.type === "Tab" || token.type === "Newline") {
                        current++;
                        token = this.tokens[current];
                    } 
                }

                return newNode;
            }

            // Strings
            if (token.type === "String") {
                current++;
                return {
                    type: "StringObj",
                    value: token.value
                };
            }

            // Numbers
            if (token.type === "Number") {
                current++;
                return {
                    type: "NumberObj",
                    value: token.value
                };
            }


            // Special operators
            if (["+", "-", "*", "/"].indexOf(token.value) !== -1) {
                current++;
                return {
                    type: "Operator",
                    value: token.value,
                    param: walk()
                };
            }

            // Identifiers
            if (token.type === "Ident") {
                current++;

                let nextToken = this.tokens[current];
                if (nextToken.type === "Colon") {
                    current++;
                    let newNode = {
                        type: "BinaryMessage",
                        name: token.value,
                        param: walk()
                    };
                    return newNode;
                }
                return {
                    type: "Ident",
                    value: token.value
                };
            }

            if (token.type === "Cascade") {
                current++;
                return {
                    type: token.type,
                    param: walk()
                };
            }
            current++;
        }

        this.ast = {
            type: "Program",
            body: []
        };

        while (current < this.tokens.length) {
            this.ast.body.push(walk());
        }

        let reduceFn = (acc, x) => {
            if (x != null) {
                if (x.body) {
                    x.body = x.body.reduce(reduceFn, []);
                }
                acc.push(x);
            }
            return acc;
        }

        this.ast.body = this.ast.body.reduce(reduceFn, [])
    }

}

module.exports.Compiler = Compiler;