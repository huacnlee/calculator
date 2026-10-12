// Pure calculator state machine, independent of the UI.

const MAX_DIGITS = 16;

export class Calculator {
  constructor() {
    this.clear();
  }

  clear() {
    this.display = "0";
    this.accumulator = null;
    this.operator = null;
    this.lastOperator = null;
    this.lastOperand = null;
    this.waitingForOperand = false;
    // Every operand and operator entered so far, in order, so the first line
    // reads back the whole chain: 1 + 2 ÷ 3 × 10 =
    this.history = [];
    this.error = "";
  }

  get expression() {
    return this.history.join(" ");
  }

  /** A number typed after "=" starts a new calculation. */
  startOperand() {
    if (!this.operator) this.history = [];
  }

  inputDigit(digit) {
    if (this.error) this.clear();
    if (this.waitingForOperand) {
      this.startOperand();
      this.display = digit;
      this.waitingForOperand = false;
      return;
    }
    if (this.display.replace(/[-.]/g, "").length >= MAX_DIGITS) return;
    this.display = this.display === "0" ? digit : this.display + digit;
  }

  inputDot() {
    if (this.error) this.clear();
    if (this.waitingForOperand) {
      this.startOperand();
      this.display = "0.";
      this.waitingForOperand = false;
      return;
    }
    if (!this.display.includes(".")) this.display += ".";
  }

  backspace() {
    if (this.error) return this.clear();
    if (this.waitingForOperand) return;
    const next = this.display.slice(0, -1);
    this.display = next === "" || next === "-" ? "0" : next;
  }

  toggleSign() {
    if (this.error || this.display === "0") return;
    this.display = this.display.startsWith("-") ? this.display.slice(1) : "-" + this.display;
  }

  percent() {
    if (this.error) return;
    this.display = format(Number(this.display) / 100);
  }

  setOperator(op) {
    if (this.error) return;
    this.lastOperator = null;
    const value = Number(this.display);
    if (this.operator && this.waitingForOperand) {
      // Pressing another operator before the next number replaces it.
      this.history[this.history.length - 1] = op;
    } else if (this.operator) {
      this.history.push(format(value), op);
      if (!this.compute(value)) return;
    } else {
      // A fresh chain, or one continuing from the last result.
      this.accumulator = value;
      this.history = [format(value), op];
    }
    this.operator = op;
    this.waitingForOperand = true;
  }

  equals() {
    if (this.error) return;
    if (this.operator) {
      this.lastOperator = this.operator;
      this.lastOperand = Number(this.display);
      this.history.push(format(this.lastOperand), "=");
    } else if (this.lastOperator) {
      // Pressing "=" again repeats the previous operation on the result.
      this.accumulator = Number(this.display);
      this.operator = this.lastOperator;
      this.history = [this.display, this.operator, format(this.lastOperand), "="];
    } else {
      return;
    }
    if (!this.compute(this.lastOperand)) return;
    this.operator = null;
    this.waitingForOperand = true;
  }

  compute(value) {
    const result = apply(this.accumulator, this.operator, value);
    if (!Number.isFinite(result)) {
      this.display = "Error";
      this.history = [];
      this.error =
        this.operator === "÷" && value === 0 ? "Cannot divide by zero" : "Result out of range";
      this.accumulator = null;
      this.operator = null;
      return false;
    }
    this.accumulator = result;
    this.display = format(result);
    return true;
  }
}

function apply(a, op, b) {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return a / b;
    default: return b;
  }
}

function format(value) {
  // Trim floating point noise such as 0.1 + 0.2.
  const rounded = Number(value.toPrecision(12));
  const text = String(rounded);
  return text.length > MAX_DIGITS ? rounded.toExponential(8) : text;
}
