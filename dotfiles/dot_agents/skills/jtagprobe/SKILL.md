---
name: jtagprobe
description: Probe IoT/embedded targets for exposed SWD/JTAG debug interfaces using a SEGGER J-Link. Detects whether debug is OPEN, LOCKED (readout-protected), or DEAD (fused off). Use when assessing whether a target's on-chip debug port can be reached, identifying the silicon vendor from DPIDR/IDCODE, and confirming halt+memory access for full debugger control.
---

# Jtagprobe — SWD/JTAG Debug Interface Tester

You are helping the user determine whether a target's on-chip debug interface is exposed via SWD or JTAG, using the `jtagprobe` tool. This drives a SEGGER J-Link physically wired to the target.

## What the tool tests

Three nested access layers are checked, and the target is classified into one of:

- `OPEN` — DP responds, CPU halts, memory reads return plausible data. Full debugger control. Critical finding.
- `LOCKED` — DP/IDCODE accessible but memory reads fail or return readout-protection sentinels (0xFFFFFFFF). Indicates STM32 RDP, NXP CRP, Nordic APPROTECT, etc. are engaged. Still a finding — the port should not respond at all in production.
- `DEAD` — No DP/IDCODE response on any tested interface/speed. Debug fused off, pins not wired, or wrong target.

## Prerequisites

- A SEGGER J-Link (any variant) connected via USB
- `JLinkExe` on PATH — verify with `which JLinkExe`. If it is installed but not on PATH, point the tool at it with `--jlink-binary /path/to/JLinkExe` instead of relying on PATH.
- Target wired to the J-Link 20-pin (or 10-pin Cortex Debug) header. Confirm SWDIO/SWCLK or TDI/TDO/TMS/TCK identification before energizing the target.

If `JLinkExe` cannot be found at all, tell the user to install SEGGER J-Link software from segger.com. Do not attempt to install it without explicit approval.

## Basic usage

Default — sweep SWD then JTAG at 4000/1000/100 kHz, halt, read memory, classify:
```bash
jtagprobe
```

Save per-attempt JLinkExe logs as evidence (recommended for pentest writeups):
```bash
jtagprobe --evidence-dir ./evidence/jtagprobe-$(date +%Y%m%d-%H%M%S)
```

JSON for chaining:
```bash
jtagprobe --format json
```

## Common workflows

### 1. Unknown target, unknown protocol

Just run with defaults. The tool will:
1. Try SWD at 4 MHz → 1 MHz → 100 kHz
2. Fall back to JTAG with the same speed sweep
3. Run a JTAG chain auto-scan as last resort
4. Identify vendor from DPIDR/IDCODE JEP106 designer field
5. Halt CPU and read memory to confirm access level

```bash
jtagprobe --evidence-dir ./evidence
```

### 2. Known target — pass the device name

If the user knows the chip, pass `--device` for a more accurate halt/memory test. Use the same device strings J-Link accepts (`STM32F407VG`, `nRF52840_xxAA`, `MK64FN1M0xxx12`, etc.):
```bash
jtagprobe --device STM32F407VG
```

### 3. Slow targets / long traces / level-shifted boards

Some pirate-flagged boards or long ribbon cables need a slower clock. Limit the sweep:
```bash
jtagprobe --speeds 1000,100,10
```

### 4. Layer-1 only (no halt)

If the target is in a state where halting would crash an active firmware path you care about (rare in pentests, common in live systems), stop after the connect probe:
```bash
jtagprobe --skip-memory
```

### 5. SWD only or JTAG only

```bash
jtagprobe --interfaces SWD
jtagprobe --interfaces JTAG --speeds 4000,1000
```

## Interpreting the output

The text format leads with the classification and reason:

```
CLASSIFICATION: LOCKED
DP/IDCODE accessible but CPU halt or memory read failed. Typical of RDP / CRP / APPROTECT engaged.

Vendor: STMicroelectronics
  SW-DP DPIDR=0x2BA01477 partno=0xBA version=2 designer_identity=0x20

Access test:
  Halted: True
  CPUID @ 0xE000ED00 = 0x410FC241
  0x08000000: 0xFFFFFFFF 0xFFFFFFFF 0xFFFFFFFF 0xFFFFFFFF [all-0xFF, possible RDP]

Protection hint: STM32 RDP Level 1/2 (see RM, FLASH_OPTR bits 15:8).
```

Key signals:
- A non-zero DPIDR / IDCODE means the silicon answered. Even alone this is reportable.
- `0xFFFFFFFF` flash reads after a successful halt = readout protection. Capture the DPIDR and document the protection mechanism.
- A "plausible vector table" (initial SP in SRAM range, reset vector with Thumb bit set) is the strongest signal of OPEN access — call this out in writeups.

## Writeup-relevant detail

For a pentest finding under CWE-1191 (improper access control on debug interface) or CWE-1244 (asset exposed via debug):

- Command run: full `jtagprobe` invocation
- Classification + reason from the output
- DPIDR / IDCODE raw value and decoded vendor
- For OPEN: vector table words proving memory was read
- For LOCKED: the all-0xFF read proving readout protection is the only line of defense (and that the port itself is still exposed)
- Evidence files from `--evidence-dir` for the appendix

## When the user says "test for JTAG"

Default assumption: they want both SWD and JTAG checked, full halt+memory test, and evidence captured. Run:
```bash
jtagprobe --evidence-dir ./evidence/jtagprobe-$(date +%Y%m%d-%H%M%S)
```

If `JLinkExe` isn't on PATH, stop and report that the SEGGER tools aren't installed.

## Limitations

- Requires physical access to the debug header and a J-Link probe wired up. This is not a network or pcap-based check.
- Generic Cortex-M device profiles are used when no `--device` is passed. Halt/memory access may succeed under a generic device even when the vendor-specific erase/unlock would not.
- JLinkExe stdout parsing is regex-based. If SEGGER changes the format in a future release the parser may need updating — `--format json` shows what was extracted.
- Does not attempt unlock / mass-erase. That is destructive and out of scope for a probe. Use the vendor's bootrom or `unlock` commands separately with explicit authorization.
