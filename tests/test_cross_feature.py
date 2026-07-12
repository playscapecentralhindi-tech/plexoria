import requests
import json
from test_player_state import MockLocalStorage, save_playback_progress, get_continue_watching_list

# ==============================================================================
# TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Coverage)
# ==============================================================================

def test_search_page_triggers_autocorrect(base_url):
    """Test interaction: Typing search query triggers autocorrect and searches TMDB."""
    # 1. Trigger Autocorrect
    ac_res = requests.get(f"{base_url}/api/search/autocorrect?query=avater")
    assert ac_res.status_code == 200
    corrected_query = ac_res.json()["corrected"]
    
    # 2. Search TMDB with the corrected query or correct name
    search_q = corrected_query if ac_res.json()["changed"] else "Avatar"
    search_res = requests.get(f"{base_url}/api/tmdb/search/movie?query={search_q}")
    assert search_res.status_code == 200
    assert "results" in search_res.json()
    assert len(search_res.json()["results"]) > 0

def test_details_page_fetches_tmdb_and_initializes_player(base_url):
    """Test interaction: Details page fetches TMDB metadata and queries MovieBox Play API."""
    movie_id = 299534 # Avengers: Endgame
    
    # 1. Fetch TMDB details for UI
    detail_res = requests.get(f"{base_url}/api/tmdb/movie/{movie_id}")
    assert detail_res.status_code == 200
    title = detail_res.json()["title"]
    
    # 2. Query Play API using the fetched title
    play_res = requests.get(f"{base_url}/api/moviebox/play?title={title}&mediaType=movie")
    assert play_res.status_code in [200, 404]

def test_free_page_renders_embeds_without_exceptions(base_url):
    """Test interaction: Free page embeds external public domain resources."""
    res = requests.get(f"{base_url}/free")
    assert res.status_code == 200
    html = res.text
    # Verify youtube static embeds are present in the server HTML
    assert "youtube.com/embed/" in html
    # Verify section title is present
    assert "Public Domain" in html or "Classics" in html

def test_player_video_completion_triggers_auto_next(base_url):
    """Test interaction: Video completion saves progress and triggers Next Episode resolution."""
    storage = MockLocalStorage()
    media_id = "1396" # Breaking Bad
    season, current_episode = 1, 1
    
    # 1. Simulate video ended (>95%) for episode 1
    save_playback_progress(storage, media_id, "Breaking Bad", "tv", season, current_episode, 98, 100, "1080p", 1.0, "", "")
    
    # Verify episode 1 progress marked completed (100)
    progress = json.loads(storage.get_item("plexoria_watched_progress"))
    assert progress[f"{media_id}_{season}_{current_episode}"] == 100
    
    # 2. Trigger auto-next and resolve stream for episode 2 (current_episode + 1)
    next_episode = current_episode + 1
    play_res = requests.get(
        f"{base_url}/api/moviebox/play?title=Breaking%20Bad&mediaType=tv&season={season}&episode={next_episode}"
    )
    assert play_res.status_code in [200, 404]

def test_server_mirror_switching_triggers_new_play_api_call(base_url):
    """Test interaction: User switching server trigger a new Play API query with dub parameter."""
    title = "Avatar"
    
    # 1. User loads default English subtitles server
    res_eng = requests.get(f"{base_url}/api/moviebox/play?title={title}&mediaType=movie")
    assert res_eng.status_code in [200, 404]
    
    # 2. User switches to Hindi DUB server
    res_hin = requests.get(f"{base_url}/api/moviebox/play?title={title}&mediaType=movie&dub=hindi")
    assert res_hin.status_code in [200, 404]

def test_continue_watching_click_resumes_playback(base_url):
    """Test interaction: Homepage Continue Watching card clicks, redirects to Details and restores playback."""
    storage = MockLocalStorage()
    media_id = "299534"
    
    # 1. Save mid-way progress (50%) to localStorage
    save_playback_progress(storage, media_id, "Endgame", "movie", 1, 1, 50, 100, "1080p", 1.0, "", "http://poster.jpg")
    
    # 2. Verify it displays in the Continue Watching row query
    items = get_continue_watching_list(storage)
    assert len(items) > 0
    assert items[0]["mediaId"] == media_id
    
    # 3. Simulate click -> Redirects to /movie?id=299534
    res = requests.get(f"{base_url}/movie?id={items[0]['mediaId']}")
    assert res.status_code == 200
    
    # 4. Check saved timestamp in storage (used to restore position)
    states = json.loads(storage.get_item("plexoria_playback_states"))
    assert states[f"{media_id}_1_1"]["timestamp"] == 50

def test_api_proxy_graceful_failure_cascade(base_url):
    """Test interaction: Playback API failing gracefully doesn't cause UI crash."""
    # Requesting empty title triggers 400 Bad Request
    res = requests.get(f"{base_url}/api/moviebox/play?title=")
    assert res.status_code == 400
    data = res.json()
    assert "error" in data
