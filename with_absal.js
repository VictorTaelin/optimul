// This is the same thing as with_formality, but using a different optimal
// λ-calculus implementation (https://github.com/MaiaVictor/abstract-algorithm)

const Absal = require("abstract-algorithm");

// Converts a number to binary
function binary(n) {
  return BigInt(n).toString(2).split("").reverse().join("");
}

// Converts a JavaScript number to a compact Church Nat. For example, the number
// 31 is converted to a function of `s`, `z`, that applies `s` 31 times to `z`:
// λs. @p0 s
//     @p1 λx. (p0 (p0 x))
//     @p2 λx. (p1 (p1 x))
//     @p3 λx. (p2 (p2 x))
//     @p4 λx. (p3 (p3 x))
//     @p5 λx. (p4 (p4 x))
//     λz. (p0 (p1 (p2 (p3 (p4 (p5 z))))))
// This is equivalent to: λs.λz.(s (s (s ...z))), but using let expressions
// (`@`) for compactness and optimal sharing.
function nat(bits) {
  var func = "λs.\n  @p0 s";
  var call = "z";
  for (var i = 1; i < bits.length; ++i) {
    func += "\n  @p"+i+" λx.(p"+(i-1)+" (p"+(i-1)+" x))";
  }
  func += "\n  λz.";
  for (var i = 0; i < bits.length; ++i) {
    if (bits[i] === "1") {
      call = "(p"+i+" "+call+")";
    }
  }
  func += call;
  return func;
};

// Creates the incrementer expression
function inc(bits) {
  var code = "";
  for (var i = 0; i < 256; ++i) {
    if (i < bits.length && bits[i] === "1") {
      code += "(I";
    } else {
      code += "(0";
    }
  };
  code += "(e)";
  for (var i = 0; i < 256; ++i) {
    code = code+")";
  };
  return "λI."+code;
};

// Multiplies two big numbers
function mul({a, b, verbose = false}) {
  a = binary(a);
  b = binary(b);

  // Benchmarking
  var start = Date.now();

  // The λ-calculus expression
  var code = `$Y λf. (λx.(f (x x)) λx.(f (x x))) // Y-Combinator
$e λe. λ0. λ1. e // Bits nil constructor
$0 λx. λe. λ0. λ1. (0 x) // Bits 0 constructor
$1 λx. λe. λ0. λ1. (1 x) // Bits 1 constructor
$id (Y λid.λx.(x e λp.(0 (id p)) λp.(1 (id p)))) // Bits identity
$inc (Y λinc.λx.λe.λ0.λ1.(x e λp.(1 p) λp.(0 (inc p)))) // Bits increment
$arg0 ${nat(a)} // The first argument as a Church-Nat
$arg1 ${inc(b)} // The second argument as an incrementer
(id (arg1 λx.(arg0 inc (0 x)))) // The multiplication expression`;

  if (verbose) {
    console.log("INPUT TERM");
    console.log("==========");
    console.log(code);
    console.log("");
  }

  // Parses a λ-term
  var term = Absal.core.read(code);

  // Compiles to interaction combinators net
  var inet = Absal.inet.read(Absal.comp.compile(term));
  //console.log(Absal.inet.show(inet));

  // Reduces the net
  var rewrites = Absal.inet.reduce(inet);

  // Decompiles back to a λ-term
  var term = Absal.comp.decompile(inet);

  // Prints the result
  if (verbose) {
    console.log("OUTPUT TERM");
    console.log("===========");
    console.log(Absal.core.show(term));
    console.log("");
  }

  if (verbose) {
    console.log("STATS");
    console.log("=====");
    console.log("- Rewrites : "+rewrites);
    console.log("- Time     : "+(Date.now()-start)/1000+"s");
    console.log("");
  }

  // Reads the bitstring contained on the result
  function read_bits(term) {
    var bits = "";
    while (true) {
      var bn = term.name;
      var b0 = term.body.name;
      var b1 = term.body.body.name;
      var term = term.body.body.body;
      if (term.ctor === "App") {
        bits += term.func.name === b0 ? "0" : "1";
        term = term.argm;
      } else {
        break;
      }
    }
    return bits;
  };

  var bits = read_bits(term);
  var numb = BigInt("0b"+bits.split("").reverse().join(""));
  return {value: numb, rewrites};
};

// Returns a random number with len digits
var rnd= (base, len) => {
  return len === 0 ? "" : "1" + rnd(base, len - 1);
  //return len === 0 ? "" : Math.floor(Math.random() * base) + rnd(base, len - 1);
};

var table = [];
var a = "0b";
var b = "0b";
for (var i = 1; i <= 128; ++i) {
  a += rnd(2,1);
  b += rnd(2,1);
  var c = mul({a, b, verbose: false});
  console.log("Results");
  console.log("=======");
  console.log(" i   =", i);
  console.log(" a   =", BigInt(a));
  console.log(" b   =", BigInt(b));
  console.log(" a*b =", c.value, "(using λ-calculus)");
  console.log(" a*b =", BigInt(a)*BigInt(b), "(using JS BigInt)");
  console.log(" rwt =", c.rewrites);
  console.log("");
  table.push(c.rewrites);
}

console.log(JSON.stringify(table, null, 2));
