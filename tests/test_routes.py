import requests

# ==============================================================================
# TIER 1: FEATURE COVERAGE - Route Resolution (F1)
# ==============================================================================

def test_homepage_resolves_and_renders(base_url):
    """Test that the homepage resolves with 200 OK and contains key elements."""
    res = requests.get(base_url)
    assert res.status_code == 200
    html = res.text.lower()
    # Check for core theme/naming
    assert "plexoria" in html
    # Check that NextJS client-side scripts are injected
    assert "_next" in html

def test_movie_details_page_resolves(base_url):
    """Test that the movie details page resolves with 200 OK."""
    res = requests.get(f"{base_url}/movie?id=299534") # Avengers: Endgame ID
    assert res.status_code == 200
    assert "_next" in res.text

def test_tv_details_page_resolves(base_url):
    """Test that the TV details page resolves with 200 OK."""
    res = requests.get(f"{base_url}/tv?id=1396") # Breaking Bad ID
    assert res.status_code == 200
    assert "_next" in res.text

def test_search_page_resolves(base_url):
    """Test that the Search page resolves with 200 OK."""
    res = requests.get(f"{base_url}/search")
    assert res.status_code == 200
    assert "_next" in res.text

def test_discover_page_resolves(base_url):
    """Test that the Discover page resolves with 200 OK."""
    res = requests.get(f"{base_url}/discover")
    assert res.status_code == 200
    assert "_next" in res.text

def test_watchlist_page_resolves(base_url):
    """Test that the Watchlist page resolves with 200 OK."""
    res = requests.get(f"{base_url}/watchlist")
    assert res.status_code == 200
    assert "_next" in res.text

def test_free_page_resolves_and_renders(base_url):
    """Test that the Free page resolves and contains section headings."""
    res = requests.get(f"{base_url}/free")
    assert res.status_code == 200
    html = res.text
    assert "Watch Free" in html or "Public Domain" in html or "Free Right Now" in html

# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES - Route Resolution (F1)
# ==============================================================================

def test_details_page_with_invalid_id(base_url):
    """Test details page with non-numeric/invalid ID resolves but handles it."""
    res = requests.get(f"{base_url}/movie?id=invalid_id_string")
    assert res.status_code == 200 # SSR page resolves, client-side renders fallback/error

def test_details_page_with_empty_id(base_url):
    """Test details page with empty ID parameter resolves gracefully."""
    res = requests.get(f"{base_url}/movie?id=")
    assert res.status_code == 200

def test_details_page_with_negative_id(base_url):
    """Test details page with negative ID resolves gracefully."""
    res = requests.get(f"{base_url}/movie?id=-99")
    assert res.status_code == 200

def test_non_existent_route_returns_404(base_url):
    """Test that a completely non-existent route returns 404 status."""
    res = requests.get(f"{base_url}/completely-non-existent-route-for-testing")
    assert res.status_code == 404

def test_search_with_special_characters(base_url):
    """Test search query string with encoded special characters resolves."""
    res = requests.get(f"{base_url}/search?q=avengers%3A%20endgame%21%40%23")
    assert res.status_code == 200
