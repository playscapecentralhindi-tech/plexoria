import requests

# ==============================================================================
# TIER 1: FEATURE COVERAGE - TMDB Proxy API (F2)
# ==============================================================================

def test_tmdb_trending_proxy_resolves(base_url):
    """Test proxying TMDB trending endpoint works and returns results."""
    res = requests.get(f"{base_url}/api/tmdb/trending/all/day")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) > 0

def test_tmdb_movie_search_proxy_resolves(base_url):
    """Test searching movies via proxy API works."""
    res = requests.get(f"{base_url}/api/tmdb/search/movie?query=avengers")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert any("avengers" in item["title"].lower() for item in data["results"])

def test_tmdb_movie_detail_proxy_resolves(base_url):
    """Test fetching movie details via proxy works."""
    res = requests.get(f"{base_url}/api/tmdb/movie/299534")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 299534
    assert "Avengers" in data["title"] or "Avengers" in data["original_title"]

def test_tmdb_tv_detail_proxy_resolves(base_url):
    """Test fetching TV show details via proxy works."""
    res = requests.get(f"{base_url}/api/tmdb/tv/1396")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1396
    assert "Breaking Bad" in data["name"]

def test_tmdb_discover_proxy_resolves(base_url):
    """Test TMDB discover endpoint proxy works."""
    res = requests.get(f"{base_url}/api/tmdb/discover/movie?sort_by=popularity.desc")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) > 0

# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES - TMDB Proxy API (F2)
# ==============================================================================

def test_tmdb_proxy_invalid_path(base_url):
    """Test that a completely invalid path returns 404/500/proper fallback."""
    res = requests.get(f"{base_url}/api/tmdb/invalid/api/endpoint/path")
    assert res.status_code in [404, 500, 502]

def test_tmdb_proxy_missing_path(base_url):
    """Test that requesting empty path handles gracefully (not crashing)."""
    res = requests.get(f"{base_url}/api/tmdb")
    assert res.status_code in [404, 400]

def test_tmdb_proxy_empty_query_params(base_url):
    """Test searching with an empty query returns 400, empty list or handles gracefully."""
    res = requests.get(f"{base_url}/api/tmdb/search/movie?query=")
    # TMDB search returns 400 or empty results for empty query; verify proxy passes it gracefully
    assert res.status_code in [200, 400]

def test_tmdb_proxy_non_existent_movie_id(base_url):
    """Test details for a non-existent movie ID returns 404."""
    res = requests.get(f"{base_url}/api/tmdb/movie/99999999")
    assert res.status_code == 404

def test_tmdb_proxy_special_characters_in_query(base_url):
    """Test search query string with spaces and special symbols is handled."""
    res = requests.get(f"{base_url}/api/tmdb/search/movie?query=spider-man:%20no%20way%20home%21")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
