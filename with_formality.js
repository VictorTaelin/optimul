var fs = require("fs");
var fm = require("formality-lang");
var base_code = fs.readFileSync("./global.fm", "utf8");

// Converts a JavaScript string to a Formality Bits (ex: "b0(b0(b1(b1(bn))))")
function make_bits(n, min_len = 0) {
  var bits = BigInt(n).toString(2).split("").reverse();
  while (bits.length < min_len) {
    bits.push("0");
  }
  return bits.map(x=>"b"+x).reduceRight((s,x) => x+"("+s+")", "bn");
}

// Reads a Formality Bits as a JavaScript string
function read_bits(term) {
  var bits = "";
  while (true) {
    var term = term.body("bn").body("b0").body("b1");
    if (term.ctor === "App") {
      bits += term.func === "b0" ? "0" : "1";
      term = term.argm;
    } else {
      break;
    }
  }
  return BigInt("0b"+bits.split("").reverse().join("")).toString(10);
};

// Multiplies two numbers in Formality
function mul(a, b) {
  // Creates code with the numbers we want to multiply
  var code = base_code + `main: Bits
    mul(${make_bits(a,512)}, ${make_bits(b,512)})`;

  // Parses and fills holes in that code
  var {defs} = fm.lang.parse_and_synth(code);

  // Normalizes using optimal mode
  var {term, stats} = fm.optx.normalize("main", defs);

  // Reads and shows result
  return {
    value: read_bits(term),
    stats: stats,
  };
};

// Tests multiplying two numbers
function test(a, b) {
  var t = Date.now();
  var a = BigInt(a); // first arg
  var b = BigInt(b); // second arg
  var f = mul(a, b); // reduces with Formality
  var c = BigInt(f.value); // gets result as BigInt
  console.log("- result   : "+a+" * "+b+" = "+c+" ("+(a*b===c?"correct":"wrong")+")");
  console.log("- peak_mem : "+(f.stats.mlen*4)+" bytes");
  console.log("- loops    : "+f.stats.step);
  console.log("- rewrites : "+f.stats.rwts);
  console.log("- time     : "+(Date.now()-t)/1000+" seconds");
};

// Generates a random bitstring
function rnd(len) {
  return len === 0 ? "" : (Math.random() > 0.5 ? "1" : "0") + rnd(len - 1);
};

var a = "0b0101010101010101";
var b = "0b1111111111111111";
a += rnd(1);
b += rnd(1);
test(a, b);
console.log("");

// Tests
//var a = "0b";
//var b = "0b";
//for (var i = 0; i < 256; ++i) {
  //console.log("Multiplying two "+(i+1)+"-bit numbers.");
  //a += rnd(1);
  //b += rnd(1);
  //test(a, b);
  //console.log("");
//};
