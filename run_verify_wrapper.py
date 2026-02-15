import subprocess
import sys

with open("verify_result.txt", "w", encoding="utf-8") as f:
    # Use -u for unbuffered output
    result = subprocess.run([sys.executable, "-u", "verify_crm_live_stats.py"], stdout=f, stderr=subprocess.STDOUT)
    print(f"Verification finished with code {result.returncode}")
