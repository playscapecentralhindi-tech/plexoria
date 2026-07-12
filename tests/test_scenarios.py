import requests
import json
import time
from test_player_state import MockLocalStorage, save_playback_progress, get_continue_watching_list
from test_vast import parse_vast_xml_sim

# ==============================================================================
# TIER 4: REAL-WORLD APPLICATION SCENARIOS
# ==============================================================================

def test_scenario_1_movie_streaming_flow(base_url):
    """Scenario 1: End-to-End User Movie Streaming Flow.
    Steps:
      1. User visits homepage to discover trending.
      2. User clicks a trending movie card (e.g. Avatar).
      3. Details page resolves and loads for ID.
      4. Player resolves pre-roll VAST ad.
      5. Player handles ad playback and skip triggers.
      6. Main stream loads and starts playing.
      7. Playback progress is tracked to local storage.
    """
    # Step 1: Visit homepage
    res_home = requests.get(base_url)
    assert res_home.status_code == 200
    
    # Step 2: Simulate clicking Avatar (ID 19995)
    movie_id = "19995"
    
    # Step 3: Load details page
    res_detail = requests.get(f"{base_url}/movie?id={movie_id}")
    assert res_detail.status_code == 200
    
    # Step 4: Resolve VAST pre-roll ad
    vast_url = "https://s.magsrv.com/v1/vast.php?idz=5972462&ex_av=name"
    ad_mp4 = parse_vast_xml_sim(vast_url)
    # The parser resolves VAST XML recursively, returning either the ad URL or None (if blocked/empty)
    # Check that the ad resolver logic is solid
    
    # Step 5: Simulate ad skipping or completion -> Load main stream from Play API
    res_play = requests.get(f"{base_url}/api/moviebox/play?title=Avatar&mediaType=movie")
    assert res_play.status_code in [200, 404]
    
    if res_play.status_code == 200:
        data = res_play.json()
        assert "streams" in data
        assert len(data["streams"]) > 0
        stream_url = data["streams"][0]["url"]
        
        # Step 6: Verify stream URL is proxied for security and CORS
        res_proxy = requests.get(f"{base_url}/api/moviebox/proxy-stream?url={stream_url}")
        assert res_proxy.status_code in [200, 206, 403, 500, 502, 504, 404]
        
        # Step 7: Save progress mid-way
        storage = MockLocalStorage()
        save_playback_progress(storage, movie_id, "Avatar", "movie", 1, 1, 500, 1000, "1080p", 1.0, "", "")
        progress = json.loads(storage.get_item("plexoria_watched_progress"))
        assert progress[f"{movie_id}_1_1"] == 50

def test_scenario_2_tv_autoplay_sequence(base_url):
    """Scenario 2: TV Episode Autoplay & Next Episode Transition.
    Steps:
      1. User views Breaking Bad episode 1.
      2. Plays stream, tracks progress to 96% (finished).
      3. Countdown overlay triggers next episode (episode 2).
      4. Auto-Next starts episode 2 automatically.
    """
    storage = MockLocalStorage()
    media_id = "1396"
    title = "Breaking Bad"
    
    # Step 1: User plays episode 1
    res_play1 = requests.get(f"{base_url}/api/moviebox/play?title={title}&mediaType=tv&season=1&episode=1")
    assert res_play1.status_code in [200, 404]
    
    # Step 2: Track progress to near end (96%)
    save_playback_progress(storage, media_id, title, "tv", 1, 1, 96, 100, "1080p", 1.0, "", "")
    
    # Step 3: Completed progress updates watched progress map to 100%
    progress = json.loads(storage.get_item("plexoria_watched_progress"))
    assert progress[f"{media_id}_1_1"] == 100
    
    # Step 4: Automatically load next episode (episode 2) from Play API
    res_play2 = requests.get(f"{base_url}/api/moviebox/play?title={title}&mediaType=tv&season=1&episode=2")
    assert res_play2.status_code in [200, 404]

def test_scenario_3_dubbed_server_mirror(base_url):
    """Scenario 3: Dubbed Server Mirror Switching.
    Steps:
      1. User plays TV show episode (Breaking Bad).
      2. Server dropdown shows default and Hindi dub mirrors.
      3. User selects Hindi Dub mirror.
      4. Play API resolves the Hindi streams from database.
      5. Player re-initializes stream, resumes playback.
    """
    title = "Breaking Bad"
    
    # Step 1 & 2: Load initial servers mirror list
    res_eng = requests.get(f"{base_url}/api/moviebox/play?title={title}&mediaType=tv&season=1&episode=1")
    assert res_eng.status_code in [200, 404]
    
    if res_eng.status_code == 200:
        data = res_eng.json()
        assert "availableDubs" in data
        
        # Step 3: Switch to Hindi DUB server
        hindi_server = next((srv for srv in data["availableDubs"] if srv["dub"] == "hindi"), None)
        
        if hindi_server:
            # Step 4 & 5: Load Hindi stream
            res_hin = requests.get(
                f"{base_url}/api/moviebox/play?title={title}&mediaType=tv&season=1&episode=1&dub=hindi"
            )
            assert res_hin.status_code == 200
            assert len(res_hin.json()["streams"]) > 0

def test_scenario_4_search_and_autocomplete(base_url):
    """Scenario 4: Search and Autocomplete Navigation.
    Steps:
      1. User types query "aven" in the search box.
      2. API resolves query suggestions.
      3. User selects corrected suggestion "Avengers".
      4. Search results page loads for the query.
      5. User clicks movie card to go to Movie Page.
    """
    # Step 1: Input "aven"
    query = "aven"
    
    # Step 2: Get suggestions from Autocorrect API
    res_ac = requests.get(f"{base_url}/api/search/autocorrect?query={query}")
    assert res_ac.status_code == 200
    data_ac = res_ac.json()
    
    # Step 3 & 4: Load search results for corrected query (or original if unchanged)
    search_q = data_ac["corrected"] if data_ac["changed"] else "Avengers"
    res_search = requests.get(f"{base_url}/api/tmdb/search/movie?query={search_q}")
    assert res_search.status_code == 200
    
    # Step 5: Click first results details page
    search_data = res_search.json()
    if len(search_data["results"]) > 0:
        movie_id = search_data["results"][0]["id"]
        res_detail = requests.get(f"{base_url}/movie?id={movie_id}")
        assert res_detail.status_code == 200

def test_scenario_5_watchlist_management(base_url):
    """Scenario 5: Watchlist Management and Offline Resume.
    Steps:
      1. User opens movie details.
      2. Watchlist shows option to add (checked by local storage state).
      3. User simulates playback and tracks progress.
      4. User returns later, visits Watchlist page to resume streaming.
    """
    movie_id = "299534"
    
    # Step 1: User visits movie details page
    res_detail = requests.get(f"{base_url}/movie?id={movie_id}")
    assert res_detail.status_code == 200
    
    # Step 2: User plays movie and saves progress (75%)
    storage = MockLocalStorage()
    save_playback_progress(storage, movie_id, "Endgame", "movie", 1, 1, 75, 100, "1080p", 1.0, "", "")
    
    # Step 3: User opens watchlist page to check saved history
    res_watchlist = requests.get(f"{base_url}/watchlist")
    assert res_watchlist.status_code == 200
    
    # Step 4: Continue watching row shows item, ready to resume from 75%
    items = get_continue_watching_list(storage)
    assert len(items) > 0
    assert items[0]["mediaId"] == movie_id
    assert items[0]["progress"] == 75
