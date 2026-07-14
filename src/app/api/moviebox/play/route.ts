import { NextRequest, NextResponse } from "next/server";

// Plexoria API version: 1.0.5 - Fixed timeouts, stream URL fields, multi-result matching
export const dynamic = "force-dynamic";

const API_BASE = "https://h5-api.aoneroom.com/wefeed-h5api-bff";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  "Referer": "https://moviebox.ph/",
  "Origin": "https://moviebox.ph",
  "X-Client-Info": '{"timezone":"Asia/Dhaka"}',
  "X-Request-Lang": "en",
  "Accept": "application/json",
  "Content-Type": "application/json",
};

interface TokenData {
  token: string;
  expiry: number;
}
const tokenCache = new Map<string, TokenData>();

const playCache = new Map<string, { data: any; expiry: number }>();
const PLAY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Per-request timeout: 8s (fits within Vercel 10s free limit with buffer)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function getBearerToken(clientIp?: string | null): Promise<string> {
  const now = Date.now();
  const cacheKey = clientIp || "default";
  const cached = tokenCache.get(cacheKey);
  if (cached && now < cached.expiry) {
    return cached.token;
  }

  try {
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };
    if (clientIp) {
      headers["X-Forwarded-For"] = clientIp;
      headers["X-Real-IP"] = clientIp;
    }

    const res = await fetchWithTimeout(`${API_BASE}/home?host=moviebox.ph`, {
      method: "GET",
      headers,
    }, 10000);

    const xUser = res.headers.get("x-user");
    let token: string | null = null;

    if (xUser) {
      try {
        const userInfo = JSON.parse(xUser);
        token = userInfo.token;
      } catch (e) {
        console.error("Failed to parse x-user header:", e);
      }
    }

    if (!token) {
      const setCookie = res.headers.get("set-cookie") || "";
      const match = setCookie.match(/token=([^;]+)/);
      if (match) token = match[1];
    }

    if (token) {
      tokenCache.set(cacheKey, { token, expiry: now + 15 * 60 * 1000 });
      return token;
    }
  } catch (error) {
    console.error("Error acquiring bearer token:", error);
  }

  return "";
}

async function makeGetRequest(url: string, token: string, clientIp?: string | null) {
  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
    "Authorization": `Bearer ${token}`,
  };
  if (clientIp) {
    headers["X-Forwarded-For"] = clientIp;
    headers["X-Real-IP"] = clientIp;
  }

  const res = await fetchWithTimeout(url, { method: "GET", headers });
  if (!res.ok) throw new Error(`API returned status ${res.status}`);
  return res.json();
}

async function makePostRequest(url: string, payload: any, token: string, clientIp?: string | null) {
  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
    "Authorization": `Bearer ${token}`,
  };
  if (clientIp) {
    headers["X-Forwarded-For"] = clientIp;
    headers["X-Real-IP"] = clientIp;
  }

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API returned status ${res.status}`);
  return res.json();
}

function cleanTitle(str: string): string {
  return str
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\([^)]+\)/g, "")
    .replace(/\b(hindi|tamil|telugu|english|sub|dub|dubbed|season|s\d+|e\d+|s\d+-s\d+)\b/gi, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shareSignificantWord(title1: string, title2: string): boolean {
  const stopWords = new Set(["the", "a", "of", "and", "in", "to", "for", "with", "on", "at", "by", "an", "is", "this", "that", "from", "s", "season", "episode", "ep", "series", "movie", "show", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]);
  const words1 = cleanTitle(title1).split(/\s+/).filter(w => w && !stopWords.has(w));
  const words2 = cleanTitle(title2).split(/\s+/).filter(w => w && !stopWords.has(w));
  return words1.some(w => words2.includes(w));
}

function getMatchScore(itemTitle: string, targetTitle: string, requestedDub?: string | null): number {
  const cleanTarget = cleanTitle(targetTitle);
  const cleanItem = cleanTitle(itemTitle);
  const rawItemTitle = itemTitle.toLowerCase();
  const rawTargetTitle = targetTitle.toLowerCase();

  if (cleanItem === cleanTarget) {
    let score = 100;
    if (requestedDub && rawItemTitle.includes(requestedDub.toLowerCase())) {
      score += 10;
    } else if (!requestedDub && (rawItemTitle.includes("hindi") || rawItemTitle.includes("tamil") || rawItemTitle.includes("telugu"))) {
      score -= 5;
    }
    return score;
  }

  if (cleanItem.includes(cleanTarget) || cleanTarget.includes(cleanItem)) {
    let score = 50;
    const lenDiff = Math.abs(cleanItem.length - cleanTarget.length);
    score -= lenDiff * 2;
    if (requestedDub && rawItemTitle.includes(requestedDub.toLowerCase())) score += 10;
    return Math.max(score, 10);
  }

  if (rawItemTitle.includes(rawTargetTitle)) return 5;

  return 0;
}

function parseLanguageFromTitle(title: string): { audioLanguage: string; isDubbed: boolean; isOriginal: boolean; isMultiAudio: boolean; language: string } {
  const t = title.toLowerCase();

  let isMultiAudio = t.includes("multi audio") || t.includes("dual audio") || t.includes("multi-audio") || t.includes("multi-lang") || t.includes("multi language");

  let audioLanguage = "";

  const bracketRegex = /[\[\(]([a-zA-Z\s]+)[\]\)]/g;
  let matches;
  while ((matches = bracketRegex.exec(title)) !== null) {
    const val = matches[1].trim();
    const valLower = val.toLowerCase();
    const ignoreList = ["full", "hd", "1080p", "720p", "uncut", "bluray", "movie", "series", "s1", "s2", "e1", "e2", "webrip", "nf", "hevc", "x264", "sub", "dub", "multi", "eng", "hindi", "tamil", "telugu"];
    if (!ignoreList.includes(valLower) && val.length > 2) {
      audioLanguage = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
      break;
    }
  }

  const languages = [
    { name: "Hindi", keywords: ["hindi", "hin"] },
    { name: "Tamil", keywords: ["tamil", "tam"] },
    { name: "Telugu", keywords: ["telugu", "tel"] },
    { name: "Malayalam", keywords: ["malayalam", "mal"] },
    { name: "Bengali", keywords: ["bengali", "ben"] },
    { name: "Japanese", keywords: ["japanese", "jap", "jp"] },
    { name: "Korean", keywords: ["korean", "kor", "ko"] },
    { name: "Chinese", keywords: ["chinese", "chi", "zh"] },
    { name: "Spanish", keywords: ["spanish", "esp", "es"] },
    { name: "French", keywords: ["french", "fre", "fr"] },
    { name: "German", keywords: ["german", "ger", "de"] },
    { name: "Italian", keywords: ["italian", "ita", "it"] },
    { name: "Russian", keywords: ["russian", "rus", "ru"] },
    { name: "Arabic", keywords: ["arabic", "ara", "ar"] },
    { name: "Turkish", keywords: ["turkish", "tur", "tr"] },
    { name: "Thai", keywords: ["thai", "tha", "th"] },
    { name: "Vietnamese", keywords: ["vietnamese", "vie", "vi"] },
    { name: "Portuguese", keywords: ["portuguese", "por", "pt"] }
  ];

  if (!audioLanguage) {
    for (const lang of languages) {
      if (lang.keywords.some(k => t.includes(k))) {
        audioLanguage = lang.name;
        break;
      }
    }
  }

  if (!audioLanguage) audioLanguage = "English";

  let isDubbed = false;
  if (t.includes("dub") || t.includes("dubbed")) {
    isDubbed = true;
  } else if (audioLanguage !== "English" && !t.includes("sub") && !t.includes("subbed")) {
    isDubbed = true;
  }

  let isOriginal = !isDubbed;
  if (t.includes("original") || t.includes("org")) {
    isOriginal = true;
    isDubbed = false;
  }

  let language = "";
  if (isMultiAudio) {
    language = "Multi Audio";
  } else if (isDubbed) {
    language = `${audioLanguage} Dub`;
  } else if (audioLanguage === "English") {
    language = "English SUB";
  } else {
    language = `${audioLanguage} Original`;
  }

  return { audioLanguage, isDubbed, isOriginal, isMultiAudio, language };
}

// FIX #3: Extract stream URL from all possible field names MovieBox uses
function extractStreamUrl(s: any): string | null {
  return s.url || s.streamUrl || s.cdnUrl || s.videoUrl || s.playUrl || s.src || null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title");
  const mediaType = searchParams.get("mediaType") || "movie";
  const season = parseInt(searchParams.get("season") || "1", 10);
  const episode = parseInt(searchParams.get("episode") || "1", 10);
  const imdbId = searchParams.get("imdbId");
  const requestedDub = searchParams.get("dub"); // e.g. "hindi", "tamil", "telugu"

  if (!title) {
    return NextResponse.json({ error: "Missing title parameter" }, { status: 400 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.ip || "103.197.204.1";

  const cacheKey = `${mediaType}:${title}:s${season}:e${episode}:${imdbId || ""}:${clientIp}`;
  const cached = playCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    console.log(`[Play Cache Hit] ${cacheKey}`);
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  }

  try {
    const token = await getBearerToken(clientIp);
    if (!token) {
      return NextResponse.json({ error: "Failed to authenticate with provider backend" }, { status: 502 });
    }

    // Build keyword list. Don't use IMDb ID — MovieBox search ignores it.
    const cleanedTitle = title.replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim();
    const keywordsToTry: string[] = [title];
    if (cleanedTitle !== title) keywordsToTry.push(cleanedTitle);

    // Search dubbed variants explicitly — MovieBox stores dubs as separate entries
    // e.g. "Pushpa 2 Hindi", "Pushpa 2 (Hindi Dubbed)", "Pushpa 2 Tamil"
    const dubLangs = ["Hindi", "Tamil", "Telugu", "Korean", "Japanese"];
    for (const lang of dubLangs) {
      keywordsToTry.push(`${cleanedTitle} ${lang}`);
    }

    // Fallback: first word of title (helps for subtitled titles)
    const firstWord = cleanedTitle.split(" ")[0];
    if (firstWord && firstWord.length > 3 && !keywordsToTry.includes(firstWord)) {
      keywordsToTry.push(firstWord);
    }

    const allSearchItems: any[] = [];
    const seenIds = new Set<number>();
    const targetType = mediaType === "movie" ? 1 : 2;

    // Run ALL keyword searches IN PARALLEL — critical for Vercel's 10s function limit
    const searchResults = await Promise.allSettled(
      keywordsToTry.map(keyword =>
        makePostRequest(`${API_BASE}/subject/search`, {
          keyword,
          page: 1,
          perPage: 20
        }, token, clientIp)
      )
    );

    for (const result of searchResults) {
      if (result.status === "rejected") continue;
      const items = result.value?.data?.items || result.value?.data?.list || [];
      for (const item of items) {
        const itemType = Number(item.type || item.subjectType || item.contentType || 0);
        if (itemType === targetType && !seenIds.has(item.subjectId)) {
          seenIds.add(item.subjectId);
          allSearchItems.push(item);
        }
      }
    }

    if (allSearchItems.length === 0) {
      return NextResponse.json({ error: "No results found in streaming database for this title" }, { status: 404 });
    }

    // Score and pick top candidates (up to 5) to try streaming from
    // Score all results — pass requestedDub so preferred language gets priority
    const scoredItems = allSearchItems
      .map((item) => ({ item, score: getMatchScore(item.title || "", title, requestedDub) }))
      .sort((a, b) => b.score - a.score);

    // Take up to 8 top-scored items for max stream coverage
    let matchedItems: typeof allSearchItems = [];
    if (scoredItems.length > 0 && scoredItems[0].score > 0) {
      matchedItems = scoredItems.slice(0, 8).filter(s => s.score > 0).map(s => s.item);
    } else if (allSearchItems.length > 0) {
      // Zero-score fallback: check if the first (most relevant) item shares a significant word
      const fallbackItem = allSearchItems[0];
      if (shareSignificantWord(fallbackItem.title || "", title)) {
        matchedItems = [fallbackItem];
      }
    }

    if (matchedItems.length === 0) {
      return NextResponse.json({ error: "No matching titles found in streaming database" }, { status: 404 });
    }

    // Concurrent Stream Resolver — try all matched items in parallel
    const streamsAndCaptions = await Promise.all(matchedItems.map(async (item) => {
      const subjectId = item.subjectId;
      const detailPath = item.detailPath;
      let actualSeason = season;

      if (mediaType === "tv") {
        try {
          const detailData = await makeGetRequest(`${API_BASE}/detail?detailPath=${detailPath}`, token, clientIp);
          const seasonsList = detailData?.data?.resource?.seasons || [];
          if (seasonsList.length > 0) {
            const targetIndex = Math.min(Math.max(season - 1, 0), seasonsList.length - 1);
            const mappedSeason = seasonsList[targetIndex].se;
            if (mappedSeason) actualSeason = mappedSeason;
          }
        } catch (err) {
          console.error(`Failed to map season for item ${item.title}:`, err);
        }
      }

      const isMovie = mediaType === "movie";
      const querySe = isMovie ? 0 : actualSeason;
      const queryEp = isMovie ? 0 : episode;
      const playUrl = `${API_BASE}/subject/play?subjectId=${subjectId}&se=${querySe}&ep=${queryEp}&detailPath=${detailPath}`;
      const playerReferer = `https://moviebox.ph/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=${querySe}&detailEp=${queryEp}&lang=en`;

      try {
        const playRes = await fetchWithTimeout(playUrl, {
          headers: {
            ...DEFAULT_HEADERS,
            "Referer": playerReferer,
            "Authorization": `Bearer ${token}`,
            ...(clientIp ? { "X-Forwarded-For": clientIp, "X-Real-IP": clientIp } : {})
          }
        }, 15000);

        if (!playRes.ok) {
          console.error(`Play request returned ${playRes.status} for "${item.title}"`);
          return null;
        }
        const playData = await playRes.json();
        const streamsData = playData?.data || {};

        // FIX #3: Check all possible stream container keys from MovieBox API
        const rawStreams: any[] = streamsData.streams || streamsData.videoList || streamsData.videoStreams || [];
        const hlsList: any[] = streamsData.hls || streamsData.hlsList || streamsData.hlsStreams || [];
        const dashList: any[] = streamsData.dash || streamsData.dashList || [];

        // Log what we got for debugging
        console.log(`[Play] "${item.title}" → streams:${rawStreams.length}, hls:${hlsList.length}, dash:${dashList.length}`);

        let captions: any[] = [];
        let streamId = null;
        let streamFormat = "MP4";

        if (rawStreams.length > 0) {
          streamId = rawStreams[0].id;
          streamFormat = rawStreams[0].format || "MP4";
        } else if (hlsList.length > 0) {
          streamId = hlsList[0].id;
          streamFormat = hlsList[0].format || "HLS";
        }

        if (streamId) {
          try {
            const captionUrl = `${API_BASE}/subject/caption?format=${streamFormat}&id=${streamId}&subjectId=${subjectId}&detailPath=${detailPath}`;
            const capRes = await fetchWithTimeout(captionUrl, {
              headers: {
                ...DEFAULT_HEADERS,
                "Authorization": `Bearer ${token}`,
                ...(clientIp ? { "X-Forwarded-For": clientIp, "X-Real-IP": clientIp } : {})
              }
            }, 8000);
            if (capRes.ok) {
              const capData = await capRes.json();
              const list = capData?.data?.captions || capData?.data || [];
              if (Array.isArray(list)) {
                captions = list.map((c: any) => ({
                  id: c.id,
                  languageCode: c.lan,
                  language: c.lanName,
                  url: c.url,
                }));
              }
            }
          } catch (err) {
            console.error(`Subtitles failed for stream ${streamId}:`, err);
          }
        }

        return { item, rawStreams, hlsList, dashList, captions };
      } catch (err) {
        console.error(`Play request failed for item "${item.title}":`, err);
        return null;
      }
    }));

    const normalizedStreams: any[] = [];
    const uniqueCaptions = new Map<string, any>();

    streamsAndCaptions.forEach((res) => {
      if (!res) return;
      const { item, rawStreams, hlsList, dashList, captions } = res;
      const parsed = parseLanguageFromTitle(item.title || "");

      captions.forEach((c: any) => {
        uniqueCaptions.set(c.url, c);
      });

      const combinedList = [
        ...rawStreams.map((s: any) => ({ ...s, streamFormat: "MP4" })),
        ...hlsList.map((s: any) => ({ ...s, streamFormat: "HLS" })),
        ...dashList.map((s: any) => ({ ...s, streamFormat: "DASH" }))
      // FIX #3: Use extractStreamUrl to check all possible URL field names
      ].filter((s: any) => !!extractStreamUrl(s));

      combinedList.forEach((s: any, idx: number) => {
        const streamUrl = extractStreamUrl(s)!;
        const resolution = s.resolutions ? `${s.resolutions}p` : `${s.resolution || "1080p"}`;
        const cleanRes = resolution.replace(/p$/, "");
        const resVal = parseInt(cleanRes) || 720;

        let score = resVal / 10;
        if (s.streamFormat === "HLS") score += 5;
        if (s.codecName && s.codecName.toLowerCase().includes("hevc")) score += 10;

        const serverName = `Server ${idx + 1} (${s.streamFormat})`;

        normalizedStreams.push({
          provider: "MovieBox",
          language: parsed.language,
          audioLanguage: parsed.audioLanguage,
          subtitleLanguages: captions.map((c: any) => c.language),
          resolution: `${resVal}p`,
          codec: s.codecName || "h264",
          hdr: s.codecName?.toLowerCase()?.includes("hevc") || false,
          streamUrl,
          health: "active",
          qualityScore: score,
          isDubbed: parsed.isDubbed,
          isOriginal: parsed.isOriginal,
          isMultiAudio: parsed.isMultiAudio,
          serverName,
          url: streamUrl // Map url for test suite compatibility
        });
      });
    });

    if (normalizedStreams.length === 0) {
      return NextResponse.json({ error: "No free streaming sources available for this title" }, { status: 404 });
    }

    const availableDubs = Array.from(new Set(normalizedStreams.map(s => s.language))).map((lang, idx) => ({
      id: idx,
      name: `Plexoria Server (${lang})`,
      dub: lang.toLowerCase().includes("hindi") ? "hindi" : (lang.toLowerCase().includes("tamil") ? "tamil" : (lang.toLowerCase().includes("telugu") ? "telugu" : (lang.toLowerCase().includes("bengali") ? "bengali" : "")))
    }));

    const hls = normalizedStreams
      .filter((s) => s.serverName.includes("HLS"))
      .map((s) => ({
        resolution: s.resolution,
        format: "HLS",
        url: s.streamUrl,
        vipLocked: false
      }));

    const dash = normalizedStreams
      .filter((s) => s.serverName.includes("DASH"))
      .map((s) => ({
        resolution: s.resolution,
        format: "DASH",
        url: s.streamUrl,
        vipLocked: false
      }));

    const responseData = {
      title: matchedItems[0].title,
      streams: normalizedStreams,
      hls, // Map root hls for test suite compatibility
      dash, // Map root dash for test suite compatibility
      captions: Array.from(uniqueCaptions.values()),
      availableDubs,
      legacyStreams: normalizedStreams.filter(s => !s.isDubbed),
      legacyHls: normalizedStreams.filter(s => !s.isDubbed && s.codec === "h264")
    };

    if (playCache.size >= 100) {
      const oldestKey = playCache.keys().next().value;
      if (oldestKey !== undefined) playCache.delete(oldestKey);
    }
    playCache.set(cacheKey, { data: responseData, expiry: Date.now() + PLAY_CACHE_TTL });

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });

  } catch (error: any) {
    console.error("Error in MovieBox route:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
