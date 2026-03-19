# GDEX Signal Bot

## What It Is
- The GDEX Signal Bot is the signal/market-read side of the system.

## Data Role
- Produces or surfaces price, trend, confidence, support, resistance, and signal context through the shared board data path.
- Its read-only data appears through market_updates and bot_signals in the current system.

## Boundary
- Signal intelligence is separate from execution authority.
- Ops remains the only execution authority.
