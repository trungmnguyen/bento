# Task Objective: Quant Signal Normalizer
Implement a standalone python module in `quant_calc.py` with:
- `normalize_prices(prices: list[float]) -> list[float]`: Scales prices into 0.0 to 1.0 range.
- If all prices are equal (flat market), return list of 0.5 to prevent division by zero.
- Include a CLI entrypoint so `python3 quant_calc.py --input "[10, 20, 30]"` outputs JSON `{"normalized": [0.0, 0.5, 1.0], "count": 3}`.
