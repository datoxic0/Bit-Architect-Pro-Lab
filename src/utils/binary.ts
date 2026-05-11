/**
 * Binary Utility Library for BinaryLab Pro
 * Handles arithmetic, conversions, and boolean logic synthesis.
 */

export type Bit = 0 | 1;

export interface ArithmeticStep {
  label: string;
  value: string;
  description?: string;
  type: 'carry' | 'operand' | 'result' | 'note';
}

export interface CalculationResult {
  binary: string;
  decimal: number;
  steps: ArithmeticStep[];
}

/**
 * Pads a string with leading zeros
 */
export const pad = (s: string, width: number): string => {
  if (s.length >= width) return s;
  return '0'.repeat(width - s.length) + s;
};

/**
 * Converts decimal digit to BCD (4-bit binary)
 */
export const decToBCD = (n: number | string): string => {
  return n.toString().split('').map(digit => {
    const d = parseInt(digit);
    return isNaN(d) ? '0000' : d.toString(2).padStart(4, '0');
  }).join(' ');
};

/**
 * Converts decimal digit to Excess-3
 */
export const decToExcess3 = (n: number | string): string => {
  return n.toString().split('').map(digit => {
    const d = parseInt(digit);
    return isNaN(d) ? '0011' : (d + 3).toString(2).padStart(4, '0');
  }).join(' ');
};

/**
 * Converts decimal to signed bit width binary (2's complement)
 */
export const decToBin = (dec: number, width: number): string => {
  if (dec >= 0) {
    return pad((dec % Math.pow(2, width)).toString(2), width);
  } else {
    // Handle negative
    const pos = Math.abs(dec);
    const bin = (pos % Math.pow(2, width)).toString(2);
    const padded = pad(bin, width);
    // Invert and add 1
    const inverted = padded.split('').map(b => (b === '0' ? '1' : '0')).join('');
    const result = (parseInt(inverted, 2) + 1).toString(2);
    return pad(result, width).slice(-width);
  }
};

/**
 * Binary Addition with Detailed Steps
 */
export const addBinary = (a: string, b: string, width: number): CalculationResult => {
  const steps: ArithmeticStep[] = [];
  const A = pad(a, width).split('').map(Number);
  const B = pad(b, width).split('').map(Number);
  let carry = 0;
  const result: number[] = [];
  const carryTrace: number[] = [0]; // Initial carry

  for (let i = width - 1; i >= 0; i--) {
    const sum = A[i] + B[i] + carry;
    result.unshift(sum % 2);
    carry = sum >= 2 ? 1 : 0;
    carryTrace.unshift(carry);
  }

  steps.push({ label: 'Carry', value: carryTrace.slice(1).join(''), type: 'carry' });
  steps.push({ label: 'A', value: A.join(''), type: 'operand' });
  steps.push({ label: 'B', value: B.join(''), type: 'operand' });
  steps.push({ label: 'Sum', value: result.join(''), type: 'result' });

  return {
    binary: result.join(''),
    decimal: parseInt(result.join(''), 2),
    steps
  };
};

/**
 * Two's Complement Subtraction
 */
export const subBinary = (a: string, b: string, width: number): CalculationResult => {
  const steps: ArithmeticStep[] = [];
  const B = pad(b, width);
  const B_inv = B.split('').map(bit => (bit === '0' ? '1' : '0')).join('');
  
  steps.push({ label: 'Operand A', value: pad(a, width), type: 'operand' });
  steps.push({ label: 'Operand B', value: B, type: 'operand' });
  steps.push({ label: '1. Invert B', value: B_inv, description: "Flip all bits of B", type: 'note' });
  
  const B_comp = decToBin(parseInt(B_inv, 2) + 1, width);
  steps.push({ label: '2. Add 1', value: B_comp, description: "B's Two's Complement", type: 'note' });
  
  const addition = addBinary(a, B_comp, width);
  steps.push(...addition.steps.map(s => ({ ...s, label: `3. ${s.label}` })));

  return {
    binary: addition.binary,
    decimal: parseInt(a, 2) - parseInt(b, 2),
    steps: [...steps]
  };
};

/**
 * Generic Bitwise Operations
 */
const bitwiseOp = (a: string, b: string, width: number, op: (x: number, y: number) => number, label: string): CalculationResult => {
  const steps: ArithmeticStep[] = [];
  const A = pad(a, width).split('').map(Number);
  const B = pad(b, width).split('').map(Number);
  const result: number[] = [];

  for (let i = 0; i < width; i++) {
    result.push(op(A[i], B[i]));
  }

  steps.push({ label: 'Operand A', value: A.join(''), type: 'operand' });
  steps.push({ label: 'Operand B', value: B.join(''), type: 'operand' });
  steps.push({ label: 'Bitwise ' + label, value: result.join(''), type: 'result' });

  return {
    binary: result.join(''),
    decimal: parseInt(result.join(''), 2),
    steps
  };
};

export const andBinary = (a: string, b: string, width: number) => bitwiseOp(a, b, width, (x, y) => x & y, 'AND');
export const orBinary = (a: string, b: string, width: number) => bitwiseOp(a, b, width, (x, y) => x | y, 'OR');
export const xorBinary = (a: string, b: string, width: number) => bitwiseOp(a, b, width, (x, y) => x ^ y, 'XOR');
export const nandBinary = (a: string, b: string, width: number) => bitwiseOp(a, b, width, (x, y) => (x & y) === 1 ? 0 : 1, 'NAND');
export const norBinary = (a: string, b: string, width: number) => bitwiseOp(a, b, width, (x, y) => (x | y) === 1 ? 0 : 1, 'NOR');
export const xnorBinary = (a: string, b: string, width: number) => bitwiseOp(a, b, width, (x, y) => x === y ? 1 : 0, 'XNOR');

/**
 * Manual Multiplication (Recursive/Long Algorithm)
 */
export const multiplyBinary = (a: string, b: string, width: number): CalculationResult => {
  const A = parseInt(a, 2) || 0;
  const B = parseInt(b, 2) || 0;
  const product = A * B;
  const resBin = product.toString(2);
  
  const steps: ArithmeticStep[] = [
    { label: 'Multiplicand', value: pad(a, width), type: 'operand' },
    { label: 'Multiplier', value: pad(b, width), type: 'operand', description: `Decimal: ${B}` },
  ];

  // Manual multiplication steps for teaching
  const bBits = b.split('').reverse();
  bBits.forEach((bit, i) => {
    if (bit === '1') {
      steps.push({ 
        label: `Partial P${i}`, 
        value: pad(a + '0'.repeat(i), width + b.length).slice(-(width + b.length)), 
        type: 'note',
        description: `A << ${i}`
      });
    }
  });

  return {
    binary: resBin,
    decimal: product,
    steps: [...steps, { label: 'Final Product', value: resBin, type: 'result' }]
  };
};

/**
 * Binary Division (Long Division Algorithm)
 */
export const divideBinary = (a: string, b: string, width: number): CalculationResult & { remainder: number, remainderBin: string } => {
  const A = parseInt(a, 2) || 0;
  const B = parseInt(b, 2) || 1; // Avoid div by zero
  
  if (B === 0) throw new Error("Division by zero");

  const quotient = Math.floor(A / B);
  const remainder = A % B;

  const steps: ArithmeticStep[] = [
    { label: 'Dividend', value: a, type: 'operand' },
    { label: 'Divisor', value: b, type: 'operand' },
    { label: 'Quotient', value: quotient.toString(2), type: 'result' },
    { label: 'Remainder', value: remainder.toString(2), type: 'note' }
  ];

  return {
    binary: quotient.toString(2),
    decimal: quotient,
    remainder,
    remainderBin: remainder.toString(2),
    steps
  };
};

/**
 * Advanced Logic Solver Utility
 * Handles Boolean Expression Parsing, Truth Tables, and Quine-McCluskey minimization.
 */

export class LogicSolver {
    static parseExpression(expr: string) {
        // Remove spaces and normalize to uppercase
        expr = expr.replace(/\s+/g, '').toUpperCase();
        
        // Map common logic symbols to standard ones (*, +, !, ^)
        const symMap: Record<string, string> = {
            '·': '*', '&': '*', '∧': '*', '∗': '*', '.': '*',
            '|': '+', '∨': '+', '∪': '+',
            '~': '!', '¬': '!', '-': '!', '−': '!', '—': '!',
            '⊕': '^', '⊻': '^',
            '⊼': 'N', '↑': 'N', // NAND
            '⊽': 'O', '↓': 'O', // NOR
            '⊙': 'X', '↔': 'X', '≡': 'X' // XNOR
        };
        
        let normalized = "";
        for (const char of expr) {
            normalized += symMap[char] || char;
        }

        // Handle prime notation A' -> !A
        // We do this before adding implicit multiplication
        normalized = normalized.replace(/([A-Z\)])'/g, '!$1');

        // Add implicit multiplication (AND)
        // Cases: A(B), AB, )A, )( 
        let processed = "";
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized[i];
            const next = normalized[i + 1];
            processed += char;
            
            if (next) {
                const isCurrentVarOrClose = /[A-Z\)]/.test(char);
                const isNextVarOrOpen = /[A-Z\(\!]/.test(next);
                
                // If we have something like A!B or AB or A(B) or )A, add *
                if (isCurrentVarOrClose && isNextVarOrOpen) {
                    // Don't add * if next is actually a + or * or ^ operator
                    if (!/[\+\*\^]/.test(next)) {
                        processed += '*';
                    }
                }
            }
        }
        
        return processed;
    }

    static evaluate(expression: string, values: Record<string, boolean>) {
        if (!expression) return false;
        
        // Prepare for JS evaluation
        let jsExpr = this.parseExpression(expression)
            .replace(/\*/g, ' && ')
            .replace(/\+/g, ' || ')
            .replace(/!/g, ' ! ')
            .replace(/\^/g, ' !== ')
            .replace(/N/g, ' !== ') // Placeholder: NAND is tricky. 
                                    // Better approach: use specific symbols and process in order.
                                    // Let's refine the replacement strategy.
        
        // Actually, let's use a more robust replacement for the evaluation
        jsExpr = this.parseExpression(expression);
        
        // Use a recursive-style replacement or careful regex to keep truth
        // Simplified for this context:
        jsExpr = jsExpr
            .replace(/N/g, ' NAND ')
            .replace(/O/g, ' NOR ')
            .replace(/X/g, ' XNOR ')
            .replace(/\*/g, ' && ')
            .replace(/\+/g, ' || ')
            .replace(/\^/g, ' !== ')
            .replace(/!/g, ' ! ');

        // Map the custom gates to JS logic
        const replacers = [
            { k: /([^\s]+)\s+NAND\s+([^\s]+)/g, v: '!($1 && $2)' },
            { k: /([^\s]+)\s+NOR\s+([^\s]+)/g, v: '!($1 || $2)' },
            { k: /([^\s]+)\s+XNOR\s+([^\s]+)/g, v: '($1 === $2)' }
        ];

        // Apply twice for nested simplicity
        for(let i=0; i<2; i++) {
            replacers.forEach(r => jsExpr = jsExpr.replace(r.k, r.v));
        }
        
        // Replace variables with their values
        // Sort variables by length descending to avoid partial matches (e.g. A1 vs A)
        const sortedKeys = Object.keys(values).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
            // Using a dynamic regex to match whole words only
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            jsExpr = jsExpr.replace(regex, values[key] ? 'true' : 'false');
        }

        try {
            // Use a safer eval-like approach
            return !!(new Function(`return (${jsExpr})`)());
        } catch (e) {
            console.error("Evaluation Error:", e, "Expr:", jsExpr);
            return false;
        }
    }

    static generateTruthTable(variables: string[]) {
        if (variables.length === 0) return [];
        const rows = Math.pow(2, variables.length);
        const table = [];
        for (let i = 0; i < rows; i++) {
            const state: Record<string, boolean> = {};
            variables.forEach((v, idx) => {
                // MSB first for standard truth table ordering
                state[v] = !!((i >> (variables.length - 1 - idx)) & 1);
            });
            table.push(state);
        }
        return table;
    }

    static extractVariables(expr: string) {
        // Match only standalone letters representing variables
        const matches = expr.match(/[A-Z]/g) || [];
        return Array.from(new Set(matches)).sort();
    }

    static solveFull(expr: string) {
        const parsed = this.parseExpression(expr);
        const variables = this.extractVariables(parsed);
        if (!variables.length) return null;

        const table = this.generateTruthTable(variables);
        const minterms: number[] = [];
        
        const results = table.map((row, idx) => {
            const val = this.evaluate(parsed, row);
            if (val) minterms.push(idx);
            return val;
        });

        // Use the minterms to synthesize a clean SOP
        const sop = this.minimizeSOP(variables, minterms);
        
        // POS is the SOP of the inverse (0-terms) negated
        const maxterms = table.map((_, i) => i).filter(i => !minterms.includes(i));
        const posRaw = this.minimizeSOP(variables, maxterms);
        const pos = this.formatPOS(posRaw);
        
        const canonical = minterms.length > 0 ? `Σm(${minterms.join(', ')})` : "0 (Always False)";
        const canonicalPOS = maxterms.length > 0 ? `ΠM(${maxterms.join(', ')})` : "1 (Always True)";
        
        const steps = [
            { title: "Input Processing", content: parsed },
            { title: "SOP Canonical", content: canonical },
            { title: "POS Canonical", content: canonicalPOS },
            { title: "Cardinality", content: `States: ${table.length} | Pulse: ${minterms.length} Highs` },
            { title: "Minimized SOP", content: sop },
            { title: "Minimized POS", content: pos }
        ];

        return { variables, table, results, minterms, maxterms, sop, pos, steps };
    }

    static formatPOS(sopExpr: string): string {
        if (sopExpr === '0') return '1';
        if (sopExpr === '1') return '0';
        
        // Helper to invert a term: A -> !A, !A -> A
        const invertLiteral = (lit: string) => lit.startsWith('!') ? lit.slice(1) : `!${lit}`;
        
        const terms = sopExpr.split(' + ');
        return terms.map(term => {
            const literals: string[] = [];
            let i = 0;
            while (i < term.length) {
                if (term[i] === '!') {
                    literals.push(invertLiteral(term[i] + term[i+1]));
                    i += 2;
                } else if (/[A-Z]/.test(term[i])) {
                    literals.push(invertLiteral(term[i]));
                    i++;
                } else i++;
            }
            return `(${literals.join(' + ')})`;
        }).join(' · ');
    }

    static minimizeSOP(variables: string[], minterms: number[]): string {
        if (!minterms.length) return '0';
        const varCount = variables.length;
        if (varCount === 0) return minterms.length ? '1' : '0';

        const implicants = new Map<string, any>(); 
        const termKey = (bits: number, mask: number) => `${bits}|${mask}`;

        const makeImplicant = (bits: number, mask: number, mins: number[]) => {
            const key = termKey(bits, mask);
            if (!implicants.has(key)) {
                implicants.set(key, { bits, mask, mins: new Set(mins), used: false });
            } else {
                mins.forEach(m => implicants.get(key).mins.add(m));
            }
            return key;
        };

        minterms.forEach(m => makeImplicant(m, (1 << varCount) - 1, [m]));

        let newCombos = true;
        while (newCombos) {
            newCombos = false;
            const currentKeys = Array.from(implicants.keys()).filter(k => !implicants.get(k).used);
            for (let i = 0; i < currentKeys.length; i++) {
                for (let j = i + 1; j < currentKeys.length; j++) {
                    const a = implicants.get(currentKeys[i]);
                    const b = implicants.get(currentKeys[j]);
                    if (a.mask !== b.mask) continue;
                    const diff = a.bits ^ b.bits;
                    if ((diff & (diff - 1)) === 0 && (diff & a.mask)) {
                        newCombos = true;
                        const newMask = a.mask & ~diff;
                        const newBits = a.bits & newMask;
                        makeImplicant(newBits, newMask, [...a.mins, ...b.mins]);
                        a.used = true;
                        b.used = true;
                    }
                }
            }
        }

        const primes = Array.from(implicants.values()).filter(im => !im.used);
        const covered = new Set();
        const chosen = [];
        
        const sortedPrimes = primes.sort((a, b) => b.mins.size - a.mins.size);
        for (const p of sortedPrimes) {
            let hasNew = false;
            for (const m of p.mins) {
                if (!covered.has(m)) { hasNew = true; break; }
            }
            if (hasNew) {
                chosen.push(p);
                for (const m of p.mins) covered.add(m);
            }
        }

        return chosen.map(p => {
            let term = '';
            for (let i = 0; i < varCount; i++) {
                const bit = varCount - 1 - i;
                if (p.mask & (1 << bit)) {
                    term += (p.bits & (1 << bit)) ? variables[i] : `${variables[i]}'`;
                }
            }
            return term || '1';
        }).join(' + ');
    }
}

/**
 * IEEE 754 Floating Point (32-bit Single Precision)
 */
export const floatToIEEE754 = (val: number) => {
  const buffer = new ArrayBuffer(4);
  const floatView = new Float32Array(buffer);
  const intView = new Uint32Array(buffer);

  floatView[0] = val;
  const bits = intView[0].toString(2).padStart(32, '0');

  const sign = bits[0];
  const exponent = bits.slice(1, 9);
  const mantissa = bits.slice(9);
  const hex = intView[0].toString(16).toUpperCase().padStart(8, '0');

  const steps: ArithmeticStep[] = [
    { label: 'Value', value: val.toString(), type: 'operand' },
    { label: 'Sign Bit', value: sign, description: sign === '0' ? 'Positive (0)' : 'Negative (1)', type: 'note' },
    { label: 'Exponent', value: exponent, description: `Biased Dec: ${parseInt(exponent, 2)}`, type: 'note' },
    { label: 'Mantissa', value: mantissa, type: 'note' },
    { label: 'Combined IEEE-754', value: bits, type: 'result' },
    { label: 'Hex Representation', value: `0x${hex}`, type: 'result' }
  ];

  return { sign, exponent, mantissa, hex, bits, steps };
};

/**
 * Gray Code Conversions
 */
export const decToGray = (n: number, width: number): string => {
  const gray = n ^ (n >> 1);
  return gray.toString(2).padStart(width, '0');
};

export const grayToDec = (grayStr: string): number => {
  let gray = parseInt(grayStr, 2);
  let n = 0;
  for (; gray; gray >>= 1) {
    n ^= gray;
  }
  return n;
};

/**
 * Hamming (7,4) Error Correction Code
 * Encodes 4 bits into 7 (adds 3 parity bits)
 */
export const encodeHamming74 = (data: string): { encoded: string, steps: ArithmeticStep[] } => {
  const d = data.split('').map(Number).slice(0, 4);
  if (d.length < 4) return { encoded: '0000000', steps: [] };

  // Parity bits: P1, P2, D1, P3, D2, D3, D4 (Standard Hamming 7,4 layout)
  // P1 = D1 + D2 + D4
  // P2 = D1 + D3 + D4
  // P3 = D2 + D3 + D4
  const p1 = (d[0] + d[1] + d[3]) % 2;
  const p2 = (d[0] + d[2] + d[3]) % 2;
  const p3 = (d[1] + d[2] + d[3]) % 2;

  const encoded = `${p1}${p2}${d[0]}${p3}${d[1]}${d[2]}${d[3]}`;

  return {
    encoded,
    steps: [
      { label: 'Data Bits', value: d.join(''), description: 'Input 4-bit word', type: 'operand' },
      { label: 'P1 (1,3,5,7)', value: String(p1), description: 'D1 ⊕ D2 ⊕ D4', type: 'note' },
      { label: 'P2 (2,3,6,7)', value: String(p2), description: 'D1 ⊕ D3 ⊕ D4', type: 'note' },
      { label: 'P3 (4,5,6,7)', value: String(p3), description: 'D2 ⊕ D3 ⊕ D4', type: 'note' },
      { label: 'Hamming Word', value: encoded, description: 'P1P2D1P3D2D3D4', type: 'result' }
    ]
  };
};

/**
 * Signed Number Information
 */
export const getSignedInfo = (val: string, width: number) => {
  const num = parseInt(val, 2);
  const isNegative = val.length === width && val[0] === '1';
  
  // Sign-Magnitude
  const smDec = isNegative 
    ? -parseInt(val.slice(1), 2)
    : parseInt(val, 2);

  // 1's Complement
  const onesVal = isNegative
    ? -(Math.pow(2, width - 1) - 1 - (num & (Math.pow(2, width - 1) - 1)))
    : num;

  // 2's Complement (Standard)
  const twosVal = isNegative
    ? num - Math.pow(2, width)
    : num;

  return {
    signMagnitude: smDec,
    onesComplement: onesVal,
    twosComplement: twosVal,
    range: `[${-Math.pow(2, width-1)}, ${Math.pow(2, width-1)-1}]`
  };
};

/**
 * Generate Reference Table Data
 */
export const generateReferenceData = (start: number, end: number, width: number = 8) => {
  const data = [];
  for (let i = start; i <= end; i++) {
    data.push({
      dec: i,
      bin: i.toString(2).padStart(width, '0'),
      hex: i.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0'),
      oct: i.toString(8).padStart(Math.ceil(width / 3), '0'),
      char: i >= 32 && i <= 126 ? String.fromCharCode(i) : (i < 32 ? 'CTRL' : 'EXT')
    });
  }
  return data;
};

export const synthesizeLogic = (numVars: number, outputs: string[]) => {
  const rows = Math.pow(2, numVars);
  const minterms: string[] = [];
  const maxterms: string[] = [];
  const table: { inputs: number[]; output: number }[] = [];

  for (let i = 0; i < rows; i++) {
    const bits = pad(i.toString(2), numVars).split('').map(Number);
    const out = parseInt(outputs[i]) || 0;
    table.push({ inputs: bits, output: out });

    const vars = bits.map((b, idx) => {
      const char = String.fromCharCode(65 + idx); // A, B, C...
      return b === 1 ? char : `!${char}`;
    });

    const maxVars = bits.map((b, idx) => {
      const char = String.fromCharCode(65 + idx);
      return b === 0 ? char : `!${char}`;
    });

    if (out === 1) minterms.push(`(${vars.join(' · ')})`);
    if (out === 0) maxterms.push(`(${maxVars.join(' + ')})`);
  }

  const variables = Array.from({ length: numVars }).map((_, i) => String.fromCharCode(65 + i));

  return {
    table,
    variables,
    sop: minterms.join(' + ') || '0',
    pos: maxterms.join(' · ') || '1'
  };
};
