import { describe, expect, test } from "bun:test";
import { analyze, stripNoise } from "../plugins/complexity-guard";

const violationsOf = (src: string, max = 10) => analyze("x.ts", src, max);

describe("stripNoise", () => {
  test("blanks comments and strings but keeps code", () => {
    const s = stripNoise(`const a = "if (x) { && }"; // if && ||
    /* for while */ const b = 1;`);
    expect(s).not.toContain("&&");
    expect(s).toContain("const b = 1");
    expect(s.split("\n").length).toBe(2); // newlines preserved
  });
  test("keeps decisions inside template interpolation", () => {
    const s = stripNoise("const s = `a ${x ? 1 : 2} b`;");
    expect(s).toContain("?");
  });
});

describe("analyze ts", () => {
  test("simple function is clean", () => {
    expect(violationsOf("function add(a, b) { return a + b; }", 1)).toEqual([]);
  });

  test("counts if/for/&&/||/ternary/case/catch", () => {
    const src = `function f(x) {
      if (x && 1) return "a";
      for (let i = 0; i < 2; i++) {}
      while (x || 2) {}
      switch (x) { case 1: break; }
      try {} catch (e) {}
      return x ? 1 : 2;
    }`;
    // base 1 + if + && + for + while + || + case + catch + ternary = 9
    const v = violationsOf(src, 8);
    expect(v.length).toBe(1);
    expect(v[0].complexity).toBe(9);
    expect(v[0].name).toBe("f");
  });

  test("ignores decisions in strings and comments", () => {
    const src = `function f() {
      const s = "if (x) { a && b }";
      // while (1) { case 2: }
      /* || */
      return s;
    }`;
    expect(violationsOf(src, 1)).toEqual([]);
  });

  test("nested arrow attributed separately; object literal is not a function", () => {
    const src = `function outer() {
      const obj = { if: 1, while: 2 };
      const inner = () => { if (1) {} if (2) {} if (3) {} if (4) {} if (5) {} if (6) {} if (7) {} if (8) {} if (9) {} if (10) {} };
      return obj;
    }`;
    const v = violationsOf(src, 10);
    expect(v.map((x) => x.name)).toEqual(["inner"]); // outer is 1, not flagged
    expect(v[0].complexity).toBe(11);
  });

  test("control-flow parens are not functions", () => {
    const src = `function f() {
      if (x) { if (y) {} }
      for (const z of list) {}
      class K { m() { if (1) {} } }
    }`;
    const v = violationsOf(src, 3);
    expect(v.map((x) => x.name)).toEqual(["f"]); // K.m stays under 4, class body not a function
  });
});

describe("analyze perl", () => {
  test("counts subs, postfix modifiers, and/or, ternary", () => {
    const src = `#!/usr/bin/perl
use strict;
# if for while -- comment noise

sub process {
    my ($orders, $user) = @_;
    return undef unless defined $orders;          # +1 unless
    if ($user->{verified} && @$orders) {          # +1 if, +1 &&
        foreach my $o (@$orders) {                # +1 foreach
            next if $o->{shipped};                # +1 if (postfix)
        }
    }
    my %tags = map { $_ => 1 } @$orders;          # fat comma, not a function
    return $user->{admin} or die "no access";     # +1 or
}
`;
    const v = analyze("lib/Orders.pm", src, 5);
    expect(v.length).toBe(1);
    expect(v[0].name).toBe("process");
    expect(v[0].complexity).toBe(7); // base + unless + if + && + foreach + postfix if + or
  });

  test("hash comments, strings, and regexes are ignored", () => {
    const src = `sub clean {
    my $s = "if (x) { && }";
    my $r = $s =~ s/if/when/r;
    # unless until for
    return $s =~ /while|or/;
}`;
    expect(analyze("x.pl", src, 1)).toEqual([]);
  });

  test("anon sub and sub with attributes", () => {
    const src = `my $handler = sub {
    if (1) {} if (2) {} if (3) {} if (4) {} if (5) {} if (6) {} if (7) {} if (8) {} if (9) {} if (10) {}
};
sub tick : lvalue {
    return 1;
}`;
    const v = analyze("x.pl", src, 10);
    expect(v.map((x) => x.name)).toEqual(["<anon>"]);
    expect(v[0].complexity).toBe(11);
  });
});

describe("analyze python", () => {
  test("counts branches per function", () => {
    const src = `
def handle(x):
    if x > 1:
        pass
    elif x < 0:
        pass
    for i in range(3):
        pass
    return [y for y in x if y]

def small():
    pass
`;
    const v = analyze("x.py", src, 5);
    expect(v.length).toBe(1);
    expect(v[0].name).toBe("handle");
    expect(v[0].complexity).toBe(6); // base + if + elif + for + comprehension for + comprehension if
    expect(v[0].line).toBe(2);
  });
});
