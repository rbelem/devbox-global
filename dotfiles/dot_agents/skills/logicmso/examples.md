# Logic MSO Analysis Examples

## Example 1: Unknown Protocol Analysis

**Scenario**: You captured an unknown digital signal and need to identify the protocol.

### Step 1: Get an overview
```bash
python3 skills/logicmso/analyze_protocol.py capture.bin
```

### Step 2: Look at timing distribution
```bash
python3 skills/logicmso/analyze_protocol.py capture.bin --histogram --clusters
```

### Step 3: Examine raw transitions
```bash
python3 skills/logicmso/analyze_protocol.py capture.bin --raw -n 50
```

### Step 4: Export for external analysis
```bash
python3 skills/logicmso/analyze_protocol.py capture.bin --export transitions.csv
```

---

## Example 2: UART Signal Analysis

**Scenario**: You suspect the signal is UART but need to determine the baud rate.

### Identifying UART
Look for these characteristics:
- Signal idles HIGH
- Consistent bit periods
- Durations are multiples of the bit period

```bash
python3 skills/logicmso/analyze_protocol.py uart_capture.bin --clusters
```

If the analyzer suggests UART with a specific baud rate:
```
Protocol Guesses
----------------------------------------
  UART (115200 baud) (85% confidence)
    Bit period ~8.7us
```

### Manual UART Decoding (Python)
```python
from saleae.mso_api.binary_files import read_file
import numpy as np

f = read_file("uart_capture.bin")
chunk = f.contents.chunks[0]
times = np.array(chunk.transition_times)

BAUD = 115200
BIT_PERIOD = 1 / BAUD

def decode_uart_byte(start_time, times, bit_period):
    """Decode a single UART byte starting at start_time."""
    byte_val = 0
    for bit_num in range(8):
        sample_time = start_time + (1.5 + bit_num) * bit_period
        idx = np.searchsorted(times, sample_time)
        state = (chunk.initial_state + idx) % 2
        if state:
            byte_val |= (1 << bit_num)
    return byte_val

# Decode bytes from transitions...
```

---

## Example 3: SPI Analysis

**Scenario**: Multi-channel SPI capture with clock and data lines.

### Identifying SPI signals
- Look for a regular clock signal (SCLK)
- CS (chip select) goes LOW during transaction
- Data sampled on clock edges

```python
from saleae.mso_api.binary_files import read_file
import numpy as np

# Load clock and data channels
clk_file = read_file("spi_clk.bin")
mosi_file = read_file("spi_mosi.bin")

clk_chunk = clk_file.contents.chunks[0]
mosi_chunk = mosi_file.contents.chunks[0]

clk_times = np.array(clk_chunk.transition_times)
mosi_times = np.array(mosi_chunk.transition_times)

# Find rising edges of clock (sample points for CPHA=0)
rising_edges = clk_times[0::2] if clk_chunk.initial_state == 0 else clk_times[1::2]

# Sample MOSI at each rising edge
def get_state_at_time(times, initial_state, t):
    idx = np.searchsorted(times, t)
    return (initial_state + idx) % 2

bits = [get_state_at_time(mosi_times, mosi_chunk.initial_state, t) for t in rising_edges]

# Group into bytes
bytes_out = []
for i in range(0, len(bits) - 7, 8):
    byte_val = sum(bits[i+j] << (7-j) for j in range(8))  # MSB first
    bytes_out.append(byte_val)

print("SPI data:", bytes(bytes_out))
```

---

## Example 4: I2C Analysis

**Scenario**: Captured I2C SDA and SCL lines.

### Identifying I2C
- Both lines idle HIGH
- START: SDA falls while SCL is HIGH
- STOP: SDA rises while SCL is HIGH
- 9 clock pulses per byte (8 data + ACK)

```python
from saleae.mso_api.binary_files import read_file
import numpy as np

sda_file = read_file("i2c_sda.bin")
scl_file = read_file("i2c_scl.bin")

sda_chunk = sda_file.contents.chunks[0]
scl_chunk = scl_file.contents.chunks[0]

sda_times = np.array(sda_chunk.transition_times)
scl_times = np.array(scl_chunk.transition_times)

def get_state_at_time(times, initial_state, t):
    idx = np.searchsorted(times, t)
    return (initial_state + idx) % 2

# Find START conditions (SDA falls while SCL is HIGH)
starts = []
for i, t in enumerate(sda_times):
    if i % 2 == (0 if sda_chunk.initial_state == 1 else 1):  # Falling edge
        if get_state_at_time(scl_times, scl_chunk.initial_state, t) == 1:
            starts.append(t)

print(f"Found {len(starts)} I2C START conditions")
```

---

## Example 5: 1-Wire Analysis

**Scenario**: Single-wire protocol (e.g., DS18B20 temperature sensor).

### Identifying 1-Wire
- Single signal, idles HIGH
- Reset pulse: ~480us LOW
- Presence pulse: ~60-240us LOW response
- Data: short LOW pulses (1-15us = 1, 60-120us = 0)

```python
from saleae.mso_api.binary_files import read_file
import numpy as np

f = read_file("onewire_capture.bin")
chunk = f.contents.chunks[0]
times = np.array(chunk.transition_times)
durations_us = np.diff(times) * 1e6

# Find reset pulses (long LOW periods)
low_idx = 1 if chunk.initial_state == 1 else 0
low_durations = durations_us[low_idx::2]

reset_pulses = [(i, d) for i, d in enumerate(low_durations) if d > 400]
print(f"Found {len(reset_pulses)} reset pulses")

# Decode data bits (after reset)
# Short LOW = 1, Long LOW = 0
data_bits = []
for d in low_durations:
    if 1 < d < 20:
        data_bits.append(1)
    elif 50 < d < 130:
        data_bits.append(0)
```

---

## Python API Quick Reference

### Load and inspect a capture
```python
from saleae.mso_api.binary_files import read_file
from pathlib import Path
import numpy as np

# Load file
f = read_file(Path("capture.bin"))
chunk = f.contents.chunks[0]

# Basic info
print(f"Sample rate: {chunk.sample_rate}")
print(f"Initial state: {chunk.initial_state}")
print(f"Transitions: {len(chunk.transition_times)}")

# Get durations
times = np.array(chunk.transition_times)
durations_us = np.diff(times) * 1e6

# Separate HIGH and LOW durations
if chunk.initial_state == 0:  # Starts LOW
    high_durations = durations_us[0::2]  # Even indices
    low_durations = durations_us[1::2]   # Odd indices
else:  # Starts HIGH
    high_durations = durations_us[1::2]  # Odd indices
    low_durations = durations_us[0::2]   # Even indices
```

### Find unique timing values
```python
# Round to nearest 10us and find unique values
unique_high = sorted(set(round(d, -1) for d in high_durations))
unique_low = sorted(set(round(d, -1) for d in low_durations))

print(f"HIGH pulse values: {unique_high}")
print(f"LOW gap values: {unique_low}")
```

### Get signal state at a specific time
```python
def get_state_at_time(times, initial_state, t):
    """Return signal state (0 or 1) at time t."""
    idx = np.searchsorted(times, t)
    return (initial_state + idx) % 2
```
