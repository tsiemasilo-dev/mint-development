#!/usr/bin/env python3
"""
Runs the mock server in a background thread, then runs both test scripts.
Usage: python3 scripts/test_db/run_tests.py
"""

import threading
import time
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))

# ── Start mock server in a background thread ───────────────────────────────
import supabase_mock

server_thread = threading.Thread(
    target=lambda: supabase_mock.app.run(port=5001, debug=False, use_reloader=False),
    daemon=True
)
server_thread.start()

# Wait until server is accepting connections
for _ in range(20):
    try:
        urllib.request.urlopen("http://localhost:5001/rest/v1/securities_c?select=id", timeout=1)
        break
    except Exception:
        time.sleep(0.3)
else:
    print("ERROR: Mock server did not start in time.")
    sys.exit(1)

print("Mock server ready on http://localhost:5001\n")
print("=" * 60)

# ── Run strategy returns test ──────────────────────────────────────────────
print("TEST 1: Strategy Returns")
print("=" * 60)
import test_strategy_returns
test_strategy_returns.main()

print("\n" + "=" * 60)

# ── Run client returns test ────────────────────────────────────────────────
print("TEST 2: Client Returns")
print("=" * 60)
import test_client_returns
test_client_returns.main()

print("\n" + "=" * 60)
print("All tests complete.")
