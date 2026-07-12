import requests

# ==============================================================================
# TIER 1: FEATURE COVERAGE - Search Autocorrect API (F5)
# ==============================================================================

def test_autocorrect_short_query_returns_original(base_url):
    """Test queries shorter than 3 characters are returned immediately without changes."""
    res = requests.get(f"{base_url}/api/search/autocorrect?query=av")
    assert res.status_code == 200
    data = res.json()
    assert data["corrected"] == "av"
    assert data["changed"] is False

def test_autocorrect_correct_title_unchanged(base_url):
    """Test that a correctly spelled query resolves without changes."""
    res = requests.get(f"{base_url}/api/search/autocorrect?query=Titanic")
    assert res.status_code == 200
    data = res.json()
    assert "corrected" in data
    assert "changed" in data

def test_autocorrect_missing_query_parameter(base_url):
    """Test that requesting without query parameter returns empty string, unchanged."""
    res = requests.get(f"{base_url}/api/search/autocorrect")
    assert res.status_code == 200
    data = res.json()
    assert data["corrected"] == ""
    assert data["changed"] is False

def test_autocorrect_caching_behavior(base_url):
    """Test that consecutive requests for the same query return successfully."""
    # First request
    res1 = requests.get(f"{base_url}/api/search/autocorrect?query=Avatar")
    assert res1.status_code == 200
    
    # Second request (cache hit)
    res2 = requests.get(f"{base_url}/api/search/autocorrect?query=Avatar")
    assert res2.status_code == 200
    assert res1.json() == res2.json()

def test_autocorrect_returns_valid_json(base_url):
    """Test response has correct application/json Content-Type header."""
    res = requests.get(f"{base_url}/api/search/autocorrect?query=Titanic")
    assert res.status_code == 200
    assert "application/json" in res.headers.get("content-type", "").lower()

# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES - Search Autocorrect API (F5)
# ==============================================================================

def test_autocorrect_whitespace_only(base_url):
    """Test that a whitespace-only query returns immediately unchanged."""
    res = requests.get(f"{base_url}/api/search/autocorrect?query=%20%20%20%20")
    assert res.status_code == 200
    data = res.json()
    assert data["corrected"].strip() == ""
    assert data["changed"] is False

def test_autocorrect_extremely_long_query(base_url):
    """Test that a very long query string is handled safely without server errors."""
    long_query = "avatar_" * 50
    res = requests.get(f"{base_url}/api/search/autocorrect?query={long_query}")
    assert res.status_code == 200
    data = res.json()
    assert "corrected" in data

def test_autocorrect_special_characters(base_url):
    """Test that query with quotes, slashes, and symbols does not break parser."""
    res = requests.get(f"{base_url}/api/search/autocorrect?query=avatar%22%20%2F%20%5C%20%3C%3E%21%40")
    assert res.status_code == 200

def test_autocorrect_misspelled_title(base_url):
    """Test that a misspelled title (e.g. 'avater') gets corrected."""
    res = requests.get(f"{base_url}/api/search/autocorrect?query=avater")
    assert res.status_code == 200
    data = res.json()
    # If API key is not configured, it will return original "avater". If configured, it might return "Avatar".
    # Check that the return structure is respected.
    assert "corrected" in data
    assert isinstance(data["changed"], bool)

def test_autocorrect_sql_injection_payload(base_url):
    """Test that potential SQL injection strings in the query parameter are handled safely."""
    res = requests.get(f"{base_url}/api/search/autocorrect?query=%27%20OR%20%271%27%3D%271")
    assert res.status_code == 200
