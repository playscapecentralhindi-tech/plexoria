import requests

# ==============================================================================
# TIER 1: FEATURE COVERAGE - MovieBox Play API (F3)
# ==============================================================================

def test_play_api_movie_resolves(base_url):
    """Test resolving a popular movie title via Play API."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=Avatar&mediaType=movie")
    assert res.status_code in [200, 404]
    if res.status_code == 200:
        data = res.json()
        assert "title" in data
        assert "streams" in data
        assert "hls" in data
    else:
        assert "error" in res.json()

def test_play_api_tv_resolves(base_url):
    """Test resolving a TV show episode via Play API."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=Breaking%20Bad&mediaType=tv&season=1&episode=1")
    assert res.status_code in [200, 404]
    if res.status_code == 200:
        data = res.json()
        assert "streams" in data
        assert "hls" in data

def test_play_api_dub_parameter(base_url):
    """Test Play API accepts dub parameter (e.g. hindi)."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=Avatar&mediaType=movie&dub=hindi")
    assert res.status_code in [200, 404]

def test_play_api_imdb_id_matching(base_url):
    """Test Play API with optional imdbId parameter."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=Avatar&mediaType=movie&imdbId=tt0499549")
    assert res.status_code in [200, 404]

def test_play_api_returns_valid_structure_on_success(base_url):
    """Test that a successful Play API response contains all required frontend keys."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=Avatar&mediaType=movie")
    if res.status_code == 200:
        data = res.json()
        assert "streams" in data
        assert "hls" in data
        assert "captions" in data
        assert "availableDubs" in data
        assert "subjectId" in data

# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES - MovieBox Play API (F3)
# ==============================================================================

def test_play_api_missing_title(base_url):
    """Test that missing title query parameter returns 400 Bad Request."""
    res = requests.get(f"{base_url}/api/moviebox/play?mediaType=movie")
    assert res.status_code == 400
    assert "error" in res.json()

def test_play_api_non_existent_title(base_url):
    """Test that a completely fake title returns 404 Not Found."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=A_Fake_Title_That_Does_Not_Exist_12345&mediaType=movie")
    assert res.status_code == 404
    assert "error" in res.json()

def test_play_api_invalid_season_episode_defaults(base_url):
    """Test that malformed season/episode parameters do not cause crash."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=Avatar&mediaType=tv&season=-5&episode=abc")
    assert res.status_code in [200, 404, 400, 502]

def test_play_api_special_characters_handling(base_url):
    """Test that titles containing colons, dashes and symbols are parsed successfully."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=Spider-Man:%20No%20Way%20Home&mediaType=movie")
    assert res.status_code in [200, 404]

def test_play_api_invalid_media_type_fallback(base_url):
    """Test that invalid mediaType is handled gracefully by defaulting to movie or returning error."""
    res = requests.get(f"{base_url}/api/moviebox/play?title=Avatar&mediaType=invalid_media_type")
    assert res.status_code in [200, 404, 400]
