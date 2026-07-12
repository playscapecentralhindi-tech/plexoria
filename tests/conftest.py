import pytest
import requests
import time
import subprocess
import os
import socket

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

@pytest.fixture(scope="session")
def base_url():
    port = 3000
    url = f"http://localhost:{port}"
    server_process = None
    
    # Check if server is already running
    if not is_port_in_use(port):
        print("\n[Test Harness] Next.js server not running. Starting one...")
        # Start the Next.js production or dev server
        # If build is present, start production server, otherwise dev server
        cmd = "npm run start" if os.path.exists("f:/Android/Plexoria/plexoria/.next") else "npm run dev"
        server_process = subprocess.Popen(
            cmd, 
            shell=True, 
            cwd="f:/Android/Plexoria/plexoria",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        # Wait for port to become active
        for _ in range(30):
            if is_port_in_use(port):
                break
            time.sleep(1)
        else:
            raise RuntimeError("Next.js server failed to start on port 3000")
        print("[Test Harness] Next.js server started successfully!")
    else:
        print("\n[Test Harness] Next.js server is already running at", url)
        
    yield url
    
    if server_process:
        print("[Test Harness] Shutting down Next.js server...")
        # On windows, taskkill is more reliable for node subprocesses
        subprocess.run(f"taskkill /F /T /PID {server_process.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
