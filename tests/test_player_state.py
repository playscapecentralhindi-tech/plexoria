import json
import pytest

# ==============================================================================
# Simulation of localStorage watched state manager (Matches VideoPlayer/Home logic)
# ==============================================================================

class MockLocalStorage:
    def __init__(self):
        self.store = {}
    
    def get_item(self, key):
        return self.store.get(key, None)
        
    def set_item(self, key, value):
        self.store[key] = str(value)
        
    def clear(self):
        self.store.clear()

def save_playback_progress(local_storage, media_id, title, media_type, season, episode, current_time, duration, quality, speed, subtitle, poster_url):
    percentage = int(round((current_time / duration) * 100)) if duration > 0 else 0
    key = f"{media_id}_{season}_{episode}"
    
    try:
        # Update plexoria_watched_progress
        stored_progress = local_storage.get_item("plexoria_watched_progress") or "{}"
        progress_map = json.loads(stored_progress)
        
        if percentage > 95:
            progress_map[key] = 100
        elif percentage > 1:
            progress_map[key] = percentage
            
        local_storage.set_item("plexoria_watched_progress", json.dumps(progress_map))
        
        # Update plexoria_playback_states
        stored_states = local_storage.get_item("plexoria_playback_states") or "{}"
        playback_states = json.loads(stored_states)
        
        playback_states[key] = {
            "timestamp": current_time,
            "progress": percentage,
            "quality": quality,
            "speed": speed,
            "subtitle": subtitle,
            "updatedAt": int(round(1000 * 1718000000)), # Simulated timestamp
            "mediaId": media_id,
            "mediaTitle": title,
            "mediaType": media_type,
            "season": season,
            "episode": episode,
            "posterUrl": poster_url
        }
        local_storage.set_item("plexoria_playback_states", json.dumps(playback_states))
    except Exception as e:
        print("Save progress error simulation:", e)

def get_continue_watching_list(local_storage):
    try:
        stored = local_storage.get_item("plexoria_playback_states")
        if stored:
            states = json.loads(stored)
            items = list(states.values())
            # Filter condition from Home page.tsx line 18:
            # item.progress < 95 && item.progress > 2 && item.mediaId && item.mediaTitle
            filtered = [
                item for item in items 
                if item.get("progress", 0) < 95 
                and item.get("progress", 0) > 2 
                and item.get("mediaId") 
                and item.get("mediaTitle")
            ]
            # Sort by updatedAt desc
            filtered.sort(key=lambda x: x.get("updatedAt", 0), reverse=True)
            return filtered[:10]
    except Exception as e:
        print("Get continue watching simulation error:", e)
    return []

# ==============================================================================
# TIER 1: FEATURE COVERAGE - Media Player State Tracking (F7)
# ==============================================================================

def test_state_initialization():
    """Test standard local storage operations on empty state."""
    storage = MockLocalStorage()
    assert storage.get_item("plexoria_watched_progress") is None
    assert storage.get_item("plexoria_playback_states") is None

def test_progress_tracking_happy_path():
    """Test saving progress within the active playback tracking bounds (e.g. 50%)."""
    storage = MockLocalStorage()
    save_playback_progress(storage, "1396", "Breaking Bad", "tv", 1, 1, 1500, 3000, "1080p", 1.0, "en", "http://image.png")
    
    progress = json.loads(storage.get_item("plexoria_watched_progress"))
    assert progress["1396_1_1"] == 50
    
    states = json.loads(storage.get_item("plexoria_playback_states"))
    assert states["1396_1_1"]["progress"] == 50
    assert states["1396_1_1"]["timestamp"] == 1500

def test_continue_watching_sorting():
    """Test that Continue Watching returns items sorted by most recent updatedAt."""
    storage = MockLocalStorage()
    # Save first item
    save_playback_progress(storage, "1", "Show 1", "movie", 1, 1, 20, 100, "1080p", 1.0, "", "")
    # Modify second item to have newer updatedAt
    stored = storage.get_item("plexoria_playback_states")
    states = json.loads(stored)
    states["1_1_1"]["updatedAt"] = 1000
    storage.set_item("plexoria_playback_states", json.dumps(states))
    
    save_playback_progress(storage, "2", "Show 2", "movie", 1, 1, 40, 100, "1080p", 1.0, "", "")
    stored = storage.get_item("plexoria_playback_states")
    states = json.loads(stored)
    states["2_1_1"]["updatedAt"] = 2000
    storage.set_item("plexoria_playback_states", json.dumps(states))
    
    items = get_continue_watching_list(storage)
    assert len(items) == 2
    assert items[0]["mediaId"] == "2"
    assert items[1]["mediaId"] == "1"

def test_continue_watching_slice_limit():
    """Test that Continue Watching row returns a maximum of 10 items."""
    storage = MockLocalStorage()
    for i in range(15):
        save_playback_progress(storage, f"id_{i}", f"Movie {i}", "movie", 1, 1, 30, 100, "720p", 1.0, "", "")
        
    items = get_continue_watching_list(storage)
    assert len(items) == 10

def test_playback_resume_position_retrieval():
    """Test that saved playback states allow retrieving the saved time stamp for resuming."""
    storage = MockLocalStorage()
    save_playback_progress(storage, "1234", "Avatar", "movie", 1, 1, 120, 200, "1080p", 1.0, "", "")
    
    states = json.loads(storage.get_item("plexoria_playback_states"))
    saved_time = states["1234_1_1"]["timestamp"]
    assert saved_time == 120

# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES - Media Player State Tracking (F7)
# ==============================================================================

def test_state_corrupt_json_handling():
    """Test that corrupt localStorage data does not cause code crashes."""
    storage = MockLocalStorage()
    storage.set_item("plexoria_playback_states", "corrupted { json data")
    
    # Homepage logic runs without throwing exception, returning empty list
    items = get_continue_watching_list(storage)
    assert items == []

def test_progress_under_threshold():
    """Test that progress below or equal to 2% is filtered out of continue watching."""
    storage = MockLocalStorage()
    save_playback_progress(storage, "1", "Intro Movie", "movie", 1, 1, 2, 100, "1080p", 1.0, "", "")
    
    items = get_continue_watching_list(storage)
    # 2% is not > 2%, so it should be filtered out
    assert len(items) == 0

def test_progress_completed_filter():
    """Test that progress above 95% is considered completed and filtered out of continue watching."""
    storage = MockLocalStorage()
    # 96% progress
    save_playback_progress(storage, "1", "Completed Movie", "movie", 1, 1, 96, 100, "1080p", 1.0, "", "")
    
    items = get_continue_watching_list(storage)
    assert len(items) == 0
    
    progress = json.loads(storage.get_item("plexoria_watched_progress"))
    assert progress["1_1_1"] == 100

def test_continue_watching_missing_fields_filtered():
    """Test that items with missing mediaId or mediaTitle are excluded."""
    storage = MockLocalStorage()
    # Save valid item
    save_playback_progress(storage, "1", "Valid", "movie", 1, 1, 30, 100, "", 1.0, "", "")
    
    # Corrupt fields manually
    states = json.loads(storage.get_item("plexoria_playback_states"))
    states["1_1_1"]["mediaTitle"] = "" # Empty title
    storage.set_item("plexoria_playback_states", json.dumps(states))
    
    items = get_continue_watching_list(storage)
    assert len(items) == 0

def test_state_deduplication():
    """Test that TV series tracking key differentiates episodes for proper resume points."""
    storage = MockLocalStorage()
    save_playback_progress(storage, "tv_show", "The Show", "tv", 1, 1, 10, 100, "", 1.0, "", "")
    save_playback_progress(storage, "tv_show", "The Show", "tv", 1, 2, 50, 100, "", 1.0, "", "")
    
    states = json.loads(storage.get_item("plexoria_playback_states"))
    assert "tv_show_1_1" in states
    assert "tv_show_1_2" in states
    assert states["tv_show_1_1"]["timestamp"] == 10
    assert states["tv_show_1_2"]["timestamp"] == 50
