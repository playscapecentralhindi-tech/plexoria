import { NextRequest, NextResponse } from "next/server";

// Plexoria API version: 1.0.4 - Cache disabled, scored matching
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
const PLAY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL to prevent URL expiration

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
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

// Fetch and cache the guest bearer token by client IP (geographic region)
async function getBearerToken(clientIp?: string | null): Promise<string> {
  const now = Date.now();
  const cacheKey = clientIp || "default";
  const cached = tokenCache.get(cacheKey);
  if (cached && now < cached.expiry) {
    return cached.token;
  }

  try {
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
    };
    if (clientIp) {
      headers["X-Forwarded-For"] = clientIp;
      headers["X-Real-IP"] = clientIp;
    }

    const res = await fetchWithTimeout(`${API_BASE}/home?host=moviebox.ph`, {
      method: "GET",
      headers,
    });

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
      if (match) {
        token = match[1];
      }
    }

    if (token) {
      tokenCache.set(cacheKey, { token, expiry: now + 15 * 60 * 1000 }); // Cache for 15 minutes
      return token;
    }
  } catch (error) {
    console.error("Error acquiring bearer token:", error);
  }

  return "";
}

// Make an authenticated get request with client IP forwarding
async function makeGetRequest(url: string, token: string, clientIp?: string | null) {
  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
    "Authorization": `Bearer ${token}`,
  };
  if (clientIp) {
    headers["X-Forwarded-For"] = clientIp;
    headers["X-Real-IP"] = clientIp;
  }

  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`API returned status ${res.status}`);
  }

  return res.json();
}

// Make an authenticated post request with client IP forwarding
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

  if (!res.ok) {
    throw new Error(`API returned status ${res.status}`);
  }

  return res.json();
}

function cleanTitle(str: string): string {
  return str
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\([^)]+\)/g, "")
    .replace(/\b(hindi|tamil|telugu|english|sub|dub|dubbed|season|s\d+|e\d+|s\d+\-s\d+)\b/gi, "")
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
    
    if (requestedDub && rawItemTitle.includes(requestedDub.toLowerCase())) {
      score += 10;
    }
    return Math.max(score, 10);
  }

  if (rawItemTitle.includes(rawTargetTitle)) {
    return 5;
  }

  return 0;
}

function parseLanguageFromTitle(title: string): { audioLanguage: string; isDubbed: boolean; isOriginal: boolean; isMultiAudio: boolean; language: string } {
  const t = title.toLowerCase();
  
  // 1. Detect multi-audio
  let isMultiAudio = t.includes("multi audio") || t.includes("dual audio") || t.includes("multi-audio") || t.includes("multi-lang") || t.includes("multi language");
  
  // 2. Parse language
  let audioLanguage = "";
  
  // Parse bracketed text, e.g. [Spanish] or (French)
  const bracketRegex = /[\[\()]([a-zA-Z\s]+)[\]\)]/g;
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

  // Keyword match fallback
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

  if (!audioLanguage) {
    audioLanguage = "English"; // Default fallback
  }

  // 3. Dub vs Sub
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

  // 4. Group name
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title");
  const mediaType = searchParams.get("mediaType") || "movie";
  const season = parseInt(searchParams.get("season") || "1", 10);
  const episode = parseInt(searchParams.get("episode") || "1", 10);
  const imdbId = searchParams.get("imdbId");

  if (!title) {
    return NextResponse.json({ error: "Missing title parameter" }, { status: 400 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.ip || "103.197.204.1";

  const cacheKey = `${mediaType}:${title}:s${season}:e${episode}:${imdbId || ""}:${clientIp}`;
  const cached = playCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    console.log(`[Play Cache Hit] Serving aggregated play data: ${cacheKey}`);
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

    const cleanedTitle = title.replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim();
    const keywordsToTry = [];

    if (imdbId && imdbId.startsWith("tt")) {
      keywordsToTry.push(imdbId);
    }
    keywordsToTry.push(title);
    if (cleanedTitle !== title) {
      keywordsToTry.push(cleanedTitle);
    }
    keywordsToTry.push(`${title} Hindi`, `${title} Tamil`, `${title} Telugu`);

    const allSearchItems: any[] = [];
    const seenIds = new Set<number>();
    const targetType = mediaType === "movie" ? 1 : 2;

    for (const keyword of keywordsToTry) {
      try {
        const searchRes = await makePostRequest(`${API_BASE}/subject/search`, {
          keyword,
          page: 1,
          perPage: 15
        }, token, clientIp);

        const items = searchRes?.data?.items || searchRes?.data?.list || [];
        for (const item of items) {
          const itemType = Number(item.type || item.subjectType || item.contentType || 0);
          if (itemType === targetType && !seenIds.has(item.subjectId)) {
            seenIds.add(item.subjectId);
            allSearchItems.push(item);
          }
        }
      } catch (err) {
        console.error(`Search failed for keyword ${keyword}:`, err);
      }
    }

    const scoredItems = allSearchItems
      .map((item) => ({ item, score: getMatchScore(item.title || "", title, null) }))
      .sort((a, b) => b.score - a.score);

    const matchedItems: typeof allSearchItems = [];
    if (scoredItems.length > 0 && scoredItems[0].score > 0) {
      matchedItems.push(scoredItems[0].item);
    } else if (allSearchItems.length > 0 && shareSignificantWord(allSearchItems[0].title || "", title)) {
      matchedItems.push(allSearchItems[0]);
    }

    if (matchedItems.length === 0) {
      return NextResponse.json({ error: "No matching titles found in streaming database" }, { status: 404 });
    }

    // Concurrent Stream Resolver
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
            if (mappedSeason) {
              actualSeason = mappedSeason;
            }
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
        });
        if (!playRes.ok) return null;
        const playData = await playRes.json();
        const streamsData = playData?.data || {};

        const rawStreams = streamsData.streams || [];
        const hlsList = streamsData.hls || [];
        const dashList = streamsData.dash || [];

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
            });
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

        return {
          item,
          rawStreams,
          hlsList,
          dashList,
          captions
        };
      } catch (err) {
        console.error(`Play request failed for item ${item.title}:`, err);
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
      ].filter((s: any) => s.url);

      combinedList.forEach((s: any, idx: number) => {
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
          streamUrl: s.url,
          health: "active",
          qualityScore: score,
          isDubbed: parsed.isDubbed,
          isOriginal: parsed.isOriginal,
          isMultiAudio: parsed.isMultiAudio,
          serverName
        });
      });
    });

    if (normalizedStreams.length === 0) {
      return NextResponse.json({ error: "No free streaming sources available for this title" }, { status: 404 });
    }

    // Dynamic availableDubs list for legacy UI support
    const availableDubs = Array.from(new Set(normalizedStreams.map(s => s.language))).map((lang, idx) => ({
      id: idx,
      name: `Plexoria Server (${lang})`,
      dub: lang.toLowerCase().includes("hindi") ? "hindi" : (lang.toLowerCase().includes("tamil") ? "tamil" : (lang.toLowerCase().includes("telugu") ? "telugu" : ""))
    }));

    const responseData = {
      title: matchedItems[0].title,
      streams: normalizedStreams,
      captions: Array.from(uniqueCaptions.values()),
      availableDubs,
      legacyStreams: normalizedStreams.filter(s => !s.isDubbed),
      legacyHls: normalizedStreams.filter(s => !s.isDubbed && s.codec === "h264")
    };

    if (playCache.size >= 100) {
      const oldestKey = playCache.keys().next().value;
      if (oldestKey !== undefined) {
        playCache.delete(oldestKey);
      }
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
