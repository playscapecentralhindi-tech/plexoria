import subprocess
import time
import requests
import os

def debug_response():
    cmd = "npm run dev"
    print("Starting dev server...")
    proc = subprocess.Popen(
        cmd,
        shell=True,
        cwd="f:/Android/Plexoria/plexoria",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(5)
    try:
        url = "http://localhost:3000/api/search/autocorrect?query=av"
        res = requests.get(url)
        print("Status code:", res.status_code)
        print("Response headers:", res.headers)
        print("Response body:", res.text)
        
        url_tmdb = "http://localhost:3000/api/tmdb/movie/299534"
        res_tmdb = requests.get(url_tmdb)
        print("TMDB status code:", res_tmdb.status_code)
        print("TMDB body:", res_tmdb.text)
    except Exception as e:
        print("Error fetching:", e)
    finally:
        print("Shutting down dev server...")
        subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True)

if __name__ == "__main__":
    debug_response()
