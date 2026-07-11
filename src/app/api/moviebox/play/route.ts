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

let cachedToken: string | null = null;
let tokenExpiry = 0;

const playCache = new Map<string, { data: any; expiry: number }>();
const PLAY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL

// Fetch and cache the guest bearer token
async function getBearerToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const res = await fetch(`${API_BASE}/home?host=moviebox.ph`, {
      method: "GET",
      headers: DEFAULT_HEADERS,
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
      cachedToken = token;
      tokenExpiry = now + 15 * 60 * 1000; // Cache for 15 minutes
      return token;
    }
  } catch (error) {
    console.error("Error acquiring bearer token:", error);
  }

  return "";
}

// Make an authenticated get request
async function makeGetRequest(url: string, token: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`API returned status ${res.status}`);
  }

  return res.json();
}

// Make an authenticated post request
async function makePostRequest(url: string, payload: any, token: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      "Authorization": `Bearer ${token}`,
    },
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title");
  const mediaType = searchParams.get("mediaType") || "movie";
  const season = parseInt(searchParams.get("season") || "1", 10);
  const episode = parseInt(searchParams.get("episode") || "1", 10);
  const dub = searchParams.get("dub");

  if (!title) {
    return NextResponse.json({ error: "Missing title parameter" }, { status: 400 });
  }

  const cacheKey = `${mediaType}:${title}:s${season}:e${episode}:d${dub || ""}`;
  const cached = playCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    console.log(`[Play Cache Hit] Serving play data: ${cacheKey}`);
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  }

  try {
    const token = await getBearerToken();
    if (!token) {
      return NextResponse.json({ error: "Failed to authenticate with provider backend" }, { status: 502 });
    }

    // 1. Determine search keywords (Hindi, Tamil, Telugu vs default)
    const cleanedTitle = title.replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim();
    let keywordsToTry = [title];
    if (cleanedTitle !== title) {
      keywordsToTry.push(cleanedTitle);
    }

    if (dub === "hindi") {
      keywordsToTry = [`${title} [Hindi]`, `${title} Hindi`, `${cleanedTitle} [Hindi]`, title];
    } else if (dub === "tamil") {
      keywordsToTry = [`${title} [Tamil]`, `${title} Tamil`, `${cleanedTitle} [Tamil]`, title];
    } else if (dub === "telugu") {
      keywordsToTry = [`${title} [Telugu]`, `${title} Telugu`, `${cleanedTitle} [Telugu]`, title];
    }

    let matchedItem: any = null;
    let searchItems: any[] = [];
    const targetType = mediaType === "movie" ? 1 : 2;

    for (const keyword of keywordsToTry) {
      console.log(`Searching MovieBox for: ${keyword}`);
      try {
        const searchRes = await makePostRequest(`${API_BASE}/subject/search`, {
          keyword,
          page: 1,
          perPage: 20
        }, token);

        const items = searchRes?.data?.items || searchRes?.data?.list || [];
        if (items.length > 0) {
          // Enforce subject type match first (ignore short clips, trailers, etc. - type 6)
          const typedItems = items.filter((item: any) => {
            const itemType = Number(item.type || item.subjectType || item.contentType || 0);
            return itemType === targetType;
          });
          const itemsToMatch = typedItems.length > 0 ? typedItems : items;

          searchItems = itemsToMatch;
          console.log("Raw items from MovieBox search:", JSON.stringify(itemsToMatch.map((i: any) => ({
            id: i.subjectId,
            title: i.title,
            type: i.type || i.subjectType || i.contentType,
            path: i.detailPath
          })), null, 2));

          // Score and rank all items to find the best match
          const scoredItems = itemsToMatch.map((item: any) => {
            const itemTitle = item.title || "";
            const score = getMatchScore(itemTitle, title, dub);
            return { item, score };
          });

          // Sort descending by score
          scoredItems.sort((a: any, b: any) => b.score - a.score);
          
          console.log("Scored search results:", JSON.stringify(scoredItems.map((si: any) => ({
            title: si.item.title,
            score: si.score
          })), null, 2));

          // Pick the item with the highest score if score > 0, otherwise fallback to first search item
          if (scoredItems.length > 0 && scoredItems[0].score > 0) {
            matchedItem = scoredItems[0].item;
          } else {
            matchedItem = itemsToMatch[0];
          }
          
          break; // Found matches, break loop
        }
      } catch (err) {
        console.error(`Search failed for keyword ${keyword}:`, err);
      }
    }

    // Compile available dub servers list dynamically
    const availableDubs: any[] = [];
    if (searchItems.length > 0) {
      const hasDefault = searchItems.some((item: any) => {
        const itemTitle = (item.title || "").toLowerCase();
        return !itemTitle.includes("hindi") && 
               !itemTitle.includes("tamil") && 
               !itemTitle.includes("telugu");
      }) || searchItems.length > 0;

      if (hasDefault) {
        availableDubs.push({ id: 0, name: "Plexoria Server (English / Multi-Sub)", dub: "" });
      }

      const hasHindi = searchItems.some((item: any) => {
        const itemTitle = (item.title || "").toLowerCase();
        return itemTitle.includes("hindi");
      });
      if (hasHindi) {
        availableDubs.push({ id: 200, name: "Plexoria Server (Hindi Dubbed)", dub: "hindi" });
      }

      const hasTamil = searchItems.some((item: any) => {
        const itemTitle = (item.title || "").toLowerCase();
        return itemTitle.includes("tamil");
      });
      if (hasTamil) {
        availableDubs.push({ id: 300, name: "Plexoria Server (Tamil Dubbed)", dub: "tamil" });
      }

      const hasTelugu = searchItems.some((item: any) => {
        const itemTitle = (item.title || "").toLowerCase();
        return itemTitle.includes("telugu");
      });
      if (hasTelugu) {
        availableDubs.push({ id: 400, name: "Plexoria Server (Telugu Dubbed)", dub: "telugu" });
      }
    } else {
      availableDubs.push({ id: 0, name: "Plexoria Server (English / Multi-Sub)", dub: "" });
    }

    if (!matchedItem) {
      return NextResponse.json({ error: "No matching titles found in streaming database" }, { status: 404 });
    }

    const subjectId = matchedItem.subjectId;
    const detailPath = matchedItem.detailPath;
    console.log(`Matched MovieBox title: ${matchedItem.title} (ID: ${subjectId}, Path: ${detailPath})`);

    // Dynamic Season Resolver: MovieBox might index seasons non-sequentially or as separate groups (e.g. S15-S16)
    let actualSeason = season;
    if (mediaType === "tv") {
      try {
        const detailData = await makeGetRequest(`${API_BASE}/detail?detailPath=${detailPath}`, token);
        const seasonsList = detailData?.data?.resource?.seasons || [];
        if (seasonsList.length > 0) {
          // Map user's 1-indexed relative season selector to the actual database season number
          const targetIndex = Math.min(Math.max(season - 1, 0), seasonsList.length - 1);
          const mappedSeason = seasonsList[targetIndex].se;
          if (mappedSeason) {
            actualSeason = mappedSeason;
            console.log(`Resolved: Mapped relative season ${season} to actual MovieBox database season ${actualSeason}`);
          }
        }
      } catch (err) {
        console.error("Failed to map season using details API:", err);
      }
    }

    // 2. Fetch media player domain
    const domRes = await fetch(`${API_BASE}/media-player/get-domain`, {
      headers: {
        ...DEFAULT_HEADERS,
        "Authorization": `Bearer ${token}`,
      }
    });
    const domData = await domRes.json();
    const domain = (domData?.data || "https://netfilm.world").replace(/\/$/, "");

    // 3. Request stream info from netfilm.world
    const isMovie = mediaType === "movie";
    const querySe = isMovie ? 0 : actualSeason;
    const queryEp = isMovie ? 0 : episode;

    const playerReferer = `https://moviebox.ph/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=${querySe}&detailEp=${queryEp}&lang=en`;
    const playUrl = `${API_BASE}/subject/play?subjectId=${subjectId}&se=${querySe}&ep=${queryEp}&detailPath=${detailPath}`;

    console.log(`Querying h5-api play URL: ${playUrl}`);
    const playRes = await fetch(playUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        "Referer": playerReferer,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!playRes.ok) {
      return NextResponse.json({ error: `Netfilm player request failed with status ${playRes.status}` }, { status: 502 });
    }

    const playData = await playRes.json();
    const streamsData = playData?.data || {};

    const rawStreams = streamsData.streams || [];
    const hlsList = streamsData.hls || [];
    const dashList = streamsData.dash || [];

    const streams = rawStreams.map((s: any) => ({
      resolution: `${s.resolutions}p`,
      format: s.format,
      url: s.url,
      size: s.size,
      duration: s.duration,
      codec: s.codecName,
      vipLocked: s.vipLocked || false,
    }));

    const hls = hlsList.map((s: any) => ({
      resolution: `${s.resolutions}p`,
      format: s.format,
      url: s.url,
      vipLocked: s.vipLocked || false,
    }));

    const dash = dashList.map((s: any) => ({
      resolution: `${s.resolutions}p`,
      format: s.format,
      url: s.url,
      vipLocked: s.vipLocked || false,
    }));

    // 4. Retrieve captions
    let captions: any[] = [];
    let streamId = null;
    let streamFormat = "MP4";

    if (rawStreams.length > 0) {
      streamId = rawStreams[0].id;
      streamFormat = rawStreams[0].format || "MP4";
    } else if (dashList.length > 0) {
      streamId = dashList[0].id;
      streamFormat = dashList[0].format || "DASH";
    } else if (hlsList.length > 0) {
      streamId = hlsList[0].id;
      streamFormat = hlsList[0].format || "HLS";
    }

    if (streamId) {
      try {
        const captionUrl = `${API_BASE}/subject/caption?format=${streamFormat}&id=${streamId}&subjectId=${subjectId}&detailPath=${detailPath}`;
        console.log(`Fetching captions from: ${captionUrl}`);
        const capRes = await fetch(captionUrl, {
          headers: {
            ...DEFAULT_HEADERS,
            "Authorization": `Bearer ${token}`
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
        console.error("Failed to retrieve subtitles:", err);
      }
    }

    const responseData = {
      title: matchedItem.title,
      subjectId,
      detailPath,
      hasResource: streamsData.hasResource || false,
      streams,
      hls,
      dash,
      captions,
      availableDubs
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
