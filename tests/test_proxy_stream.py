import requests

# ==============================================================================
# TIER 1: FEATURE COVERAGE - Proxy Stream API (F4)
# ==============================================================================

def test_proxy_stream_aoneroom_allowed(base_url):
    """Test that stream URLs from aoneroom.com are allowed (not 403 Forbidden)."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url=https://aoneroom.com/stream-test-path")
    assert res.status_code != 403

def test_proxy_stream_subdomain_allowed(base_url):
    """Test that subdomains of aoneroom.com are allowed."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url=https://sub.aoneroom.com/stream-test-path")
    assert res.status_code != 403

def test_proxy_stream_netfilm_allowed(base_url):
    """Test that netfilm.world stream URLs are allowed."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url=https://netfilm.world/stream-test-path")
    assert res.status_code != 403

def test_proxy_stream_hakuna_allowed(base_url):
    """Test that hakunaymatata.com stream URLs are allowed."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url=https://hakunaymatata.com/stream-test-path")
    assert res.status_code != 403

def test_proxy_stream_range_headers_accepted(base_url):
    """Test range request headers are parsed and accepted."""
    headers = {"Range": "bytes=0-100"}
    res = requests.get(
        f"{base_url}/api/moviebox/proxy-stream?url=https://netfilm.world/stream-test-path", 
        headers=headers
    )
    # Range is accepted, should not return 403 or 400
    assert res.status_code not in [400, 403]

# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES - Proxy Stream API (F4)
# ==============================================================================

def test_proxy_stream_blocked_domain(base_url):
    """Test that disallowed domains (SSRF protection) return 403 Forbidden."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url=https://evil-attacker.com/stream")
    assert res.status_code == 403
    assert "Forbidden target domain" in res.text

def test_proxy_stream_invalid_protocol(base_url):
    """Test that non-http/https protocols return 403 Forbidden."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url=ftp://aoneroom.com/stream")
    assert res.status_code == 403
    assert "Forbidden protocol" in res.text

def test_proxy_stream_missing_url(base_url):
    """Test that missing url parameter returns 400 Bad Request."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream")
    assert res.status_code == 400
    assert "Missing url parameter" in res.text

def test_proxy_stream_malformed_url(base_url):
    """Test that unparseable/invalid url returns 400 Bad Request."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url=not-a-valid-url")
    assert res.status_code == 400
    assert "Invalid url parameter" in res.text

def test_proxy_stream_fake_subdomain_denied(base_url):
    """Test that domains ending with aoneroom.com but not subdomains are denied."""
    res = requests.get(f"{base_url}/api/moviebox/proxy-stream?url=https://fakeaoneroom.com/stream")
    assert res.status_code == 403
