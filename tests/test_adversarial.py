import concurrent.futures
import requests
import pytest

# ==============================================================================
# TIER 5: ADVERSARIAL & STRESS TESTING
# ==============================================================================

def test_autocorrect_concurrency_stress(base_url):
    """Stress-test autocorrect endpoint with multiple concurrent requests to verify thread safety/no deadlocks."""
    queries = [
        "avater", "neja 2", "spidrman", "titanik", "incepton",
        "gladator", "interstellar", "matrix", "batman", "superman",
        "iron man", "thor", "hulk", "captain america", "black widow"
    ]
    
    def fetch_autocorrect(q):
        url = f"{base_url}/api/search/autocorrect?query={q}"
        try:
            res = requests.get(url, timeout=15)
            return res.status_code, res.json()
        except Exception as e:
            return 500, str(e)
            
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(fetch_autocorrect, queries))
        
    for status, data in results:
        assert status == 200
        assert isinstance(data, dict)
        assert "corrected" in data
        assert "changed" in data

def test_play_api_concurrency_stress(base_url):
    """Stress-test play API with multiple concurrent requests to verify responsiveness and cache stability."""
    titles = ["Avatar", "Titanic", "Breaking Bad", "Stranger Things", "Avengers"]
    
    def fetch_play(title):
        url = f"{base_url}/api/moviebox/play?title={title}&mediaType=movie"
        try:
            res = requests.get(url, timeout=10)
            return res.status_code, res.json()
        except Exception as e:
            return 500, str(e)
            
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(fetch_play, titles))
        
    for status, data in results:
        # Should either successfully find (200) or report missing (404) or bad gateway if upstream is down, but not hang or crash (500)
        assert status in [200, 404, 502, 504]

def test_proxy_stream_ssrf_evasions(base_url):
    """Test proxy stream SSRF protection with adversarial URL formulations."""
    evasions = [
        "https://aoneroom.com@evil.com/stream",
        "https://evil.com/aoneroom.com",
        "https://evil.com?q=aoneroom.com",
        "https://aoneroom.com.evil.com/stream",
        "http://127.0.0.1",
        "http://localhost",
        "https://[::1]"
    ]
    for url in evasions:
        res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url={url}")
        assert res.status_code == 403 or res.status_code == 400

def test_play_api_integer_overflow(base_url):
    """Test play API with extremely large season and episode integers to verify no crashes/overflow errors."""
    res = requests.get(
        f"{base_url}/api/moviebox/play?title=Avatar&mediaType=tv&season=999999999999999999999999999999&episode=999999999999999999999999999999"
    )
    # The API should default them, ignore them or fail gracefully, but not internal server error/crash
    assert res.status_code in [200, 400, 404, 502, 504]

def test_play_api_huge_title_payload(base_url):
    """Test play API with a massive title string (5000 chars) to check buffer overflow/crash tolerance."""
    huge_title = "A" * 5000
    res = requests.get(f"{base_url}/api/moviebox/play?title={huge_title}&mediaType=movie")
    # API should return 400, 404, or 414 URI Too Long depending on server limits, but not crash with 500
    assert res.status_code in [400, 404, 414, 502, 504]

def test_gemini_decide_malformed_json(base_url):
    """Test gemini-decide API with malformed/nested JSON payloads."""
    headers = {"Content-Type": "application/json"}
    payloads = [
        "{ invalid json",
        '{"mediaType": "movie", "id": [1, 2, 3]}', # id is array instead of string/int
        '{"mediaType": {}, "id": 123}',             # mediaType is object
        '{"mediaType": "movie", "id": 123, "season": "huge_string_instead_of_number"}'
    ]
    for payload in payloads:
        res = requests.post(f"{base_url}/api/gemini-decide", data=payload, headers=headers)
        assert res.status_code in [200, 400] # should either succeed with default fallback or fail cleanly with 400 Bad Request
