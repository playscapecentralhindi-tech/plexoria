<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$title = isset($_GET['title']) ? $_GET['title'] : null;
$mediaType = isset($_GET['mediaType']) ? $_GET['mediaType'] : 'movie';
$season = isset($_GET['season']) ? intval($_GET['season']) : 1;
$episode = isset($_GET['episode']) ? intval($_GET['episode']) : 1;
$dub = isset($_GET['dub']) ? $_GET['dub'] : null;

if (!$title) {
    echo json_encode(["error" => "Missing title parameter"]);
    exit(400);
}

$API_BASE = "https://h5-api.aoneroom.com/wefeed-h5api-bff";
$DEFAULT_HEADERS = [
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Referer: https://moviebox.ph/",
    "Origin: https://moviebox.ph",
    "X-Client-Info: {\"timezone\":\"Asia/Dhaka\"}",
    "X-Request-Lang: en",
    "Accept: application/json",
    "Content-Type: application/json"
];

function makeRequest($url, $method = 'GET', $payload = null, $headers = []) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($payload) ? json_encode($payload) : $payload);
        }
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    $responseHeaders = [];
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeaders) {
        $len = strlen($header);
        $parts = explode(':', $header, 2);
        if (count($parts) < 2) return $len;
        
        $key = strtolower(trim($parts[0]));
        $val = trim($parts[1]);
        
        if (isset($responseHeaders[$key])) {
            if (is_array($responseHeaders[$key])) {
                $responseHeaders[$key][] = $val;
            } else {
                $responseHeaders[$key] = [$responseHeaders[$key], $val];
            }
        } else {
            $responseHeaders[$key] = $val;
        }
        return $len;
    });
    
    $body = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'body' => $body,
        'headers' => $responseHeaders
    ];
}

function getBearerToken($API_BASE, $DEFAULT_HEADERS) {
    $cacheFile = __DIR__ . '/token_cache.txt';
    $now = time();
    if (file_exists($cacheFile)) {
        $data = json_decode(file_get_contents($cacheFile), true);
        if (isset($data['token']) && isset($data['expiry']) && $data['expiry'] > $now) {
            return $data['token'];
        }
    }
    
    $res = makeRequest("$API_BASE/home?host=moviebox.ph", "GET", null, $DEFAULT_HEADERS);
    $token = null;
    
    if (isset($res['headers']['x-user'])) {
        $xUserHeader = $res['headers']['x-user'];
        if (is_array($xUserHeader)) {
            $xUserHeader = $xUserHeader[count($xUserHeader) - 1];
        }
        $userInfo = json_decode($xUserHeader, true);
        if (isset($userInfo['token'])) {
            $token = $userInfo['token'];
        }
    }
    
    if (!$token && isset($res['headers']['set-cookie'])) {
        $cookieHeader = $res['headers']['set-cookie'];
        if (is_array($cookieHeader)) {
            $cookieHeader = implode('; ', $cookieHeader);
        }
        if (preg_match('/token=([^;]+)/', $cookieHeader, $matches)) {
            $token = $matches[1];
        }
    }
    
    if ($token) {
        $cacheData = [
            'token' => $token,
            'expiry' => $now + 900
        ];
        @file_put_contents($cacheFile, json_encode($cacheData));
        return $token;
    }
    
    return "";
}

try {
    $token = getBearerToken($API_BASE, $DEFAULT_HEADERS);
    if (!$token) {
        echo json_encode(["error" => "Failed to authenticate with provider backend"]);
        exit(502);
    }
    
    $authHeaders = array_merge($DEFAULT_HEADERS, ["Authorization: Bearer $token"]);
    
    $cleanedTitle = preg_replace('/\s+/', ' ', trim(str_replace([':', '-'], ' ', $title)));
    $keywordsToTry = [$title];
    if ($cleanedTitle !== $title) {
        $keywordsToTry[] = $cleanedTitle;
    }
    
    if ($dub === 'hindi') {
        $keywordsToTry = ["$title [Hindi]", "$title Hindi", "$cleanedTitle [Hindi]", $title];
    } else if ($dub === 'tamil') {
        $keywordsToTry = ["$title [Tamil]", "$title Tamil", "$cleanedTitle [Tamil]", $title];
    } else if ($dub === 'telugu') {
        $keywordsToTry = ["$title [Telugu]", "$title Telugu", "$cleanedTitle [Telugu]", $title];
    }
    
    $matchedItem = null;
    $searchItems = [];
    $targetType = $mediaType === 'movie' ? 1 : 2;
    
    foreach ($keywordsToTry as $keyword) {
        $searchRes = makeRequest("$API_BASE/subject/search", "POST", [
            "keyword" => $keyword,
            "page" => 1,
            "perPage" => 20
        ], $authHeaders);
        
        if ($searchRes['code'] === 200) {
            $searchData = json_decode($searchRes['body'], true);
            $items = isset($searchData['data']['items']) ? $searchData['data']['items'] : (isset($searchData['data']['list']) ? $searchData['data']['list'] : []);
            
            if (count($items) > 0) {
                $typedItems = array_values(array_filter($items, function($item) use ($targetType) {
                    $itemType = intval(isset($item['type']) ? $item['type'] : (isset($item['subjectType']) ? $item['subjectType'] : (isset($item['contentType']) ? $item['contentType'] : 0)));
                    return $itemType === $targetType;
                }));
                
                $itemsToMatch = count($typedItems) > 0 ? $typedItems : $items;
                $searchItems = $itemsToMatch;
                
                if ($dub) {
                    foreach ($itemsToMatch as $item) {
                        $itemTitle = strtolower(isset($item['title']) ? $item['title'] : '');
                        if (strpos($itemTitle, strtolower($dub)) !== false && strpos($itemTitle, strtolower($title)) !== false) {
                            $matchedItem = $item;
                            break;
                        }
                    }
                } else {
                    foreach ($itemsToMatch as $item) {
                        $itemTitle = strtolower(isset($item['title']) ? $item['title'] : '');
                        if (strpos($itemTitle, strtolower($title)) !== false && 
                            strpos($itemTitle, 'hindi') === false && 
                            strpos($itemTitle, 'tamil') === false && 
                            strpos($itemTitle, 'telugu') === false) {
                            $matchedItem = $item;
                            break;
                        }
                    }
                }
                
                if (!$matchedItem) {
                    foreach ($itemsToMatch as $item) {
                        $itemTitle = strtolower(isset($item['title']) ? $item['title'] : '');
                        if (strpos($itemTitle, strtolower($title)) !== false) {
                            $matchedItem = $item;
                            break;
                        }
                    }
                }
                
                if (!$matchedItem && count($itemsToMatch) > 0) {
                    $matchedItem = $itemsToMatch[0];
                }
                
                break;
            }
        }
    }
    
    $availableDubs = [];
    if (count($searchItems) > 0) {
        $hasDefault = false;
        foreach ($searchItems as $item) {
            $itemTitle = strtolower(isset($item['title']) ? $item['title'] : '');
            if (strpos($itemTitle, strtolower($title)) !== false && 
                strpos($itemTitle, 'hindi') === false && 
                strpos($itemTitle, 'tamil') === false && 
                strpos($itemTitle, 'telugu') === false) {
                $hasDefault = true;
                break;
            }
        }
        if ($hasDefault || count($searchItems) > 0) {
            $availableDubs[] = ["id" => 0, "name" => "Plexoria Server (English / Multi-Sub)", "dub" => ""];
        }
        
        $hasHindi = false;
        foreach ($searchItems as $item) {
            $itemTitle = strtolower(isset($item['title']) ? $item['title'] : '');
            if (strpos($itemTitle, 'hindi') !== false && strpos($itemTitle, strtolower($title)) !== false) {
                $hasHindi = true;
                break;
            }
        }
        if ($hasHindi) {
            $availableDubs[] = ["id" => 200, "name" => "Plexoria Server (Hindi Dubbed)", "dub" => "hindi"];
        }
        
        $hasTamil = false;
        foreach ($searchItems as $item) {
            $itemTitle = strtolower(isset($item['title']) ? $item['title'] : '');
            if (strpos($itemTitle, 'tamil') !== false && strpos($itemTitle, strtolower($title)) !== false) {
                $hasTamil = true;
                break;
            }
        }
        if ($hasTamil) {
            $availableDubs[] = ["id" => 300, "name" => "Plexoria Server (Tamil Dubbed)", "dub" => "tamil"];
        }
        
        $hasTelugu = false;
        foreach ($searchItems as $item) {
            $itemTitle = strtolower(isset($item['title']) ? $item['title'] : '');
            if (strpos($itemTitle, 'telugu') !== false && strpos($itemTitle, strtolower($title)) !== false) {
                $hasTelugu = true;
                break;
            }
        }
        if ($hasTelugu) {
            $availableDubs[] = ["id" => 400, "name" => "Plexoria Server (Telugu Dubbed)", "dub" => "telugu"];
        }
    } else {
        $availableDubs[] = ["id" => 0, "name" => "Plexoria Server (English / Multi-Sub)", "dub" => ""];
    }
    
    if (!$matchedItem) {
        echo json_encode(["error" => "No matching titles found in streaming database"]);
        exit(404);
    }
    
    $subjectId = $matchedItem['subjectId'];
    $detailPath = $matchedItem['detailPath'];
    
    $actualSeason = $season;
    if ($mediaType === 'tv') {
        $detailRes = makeRequest("$API_BASE/detail?detailPath=" . urlencode($detailPath), "GET", null, $authHeaders);
        if ($detailRes['code'] === 200) {
            $detailData = json_decode($detailRes['body'], true);
            $seasonsList = isset($detailData['data']['resource']['seasons']) ? $detailData['data']['resource']['seasons'] : [];
            if (count($seasonsList) > 0) {
                $targetIndex = min(max($season - 1, 0), count($seasonsList) - 1);
                $mappedSeason = isset($seasonsList[$targetIndex]['se']) ? $seasonsList[$targetIndex]['se'] : null;
                if ($mappedSeason) {
                    $actualSeason = $mappedSeason;
                }
            }
        }
    }
    
    $domRes = makeRequest("$API_BASE/media-player/get-domain", "GET", null, $authHeaders);
    $domain = "https://netfilm.world";
    if ($domRes['code'] === 200) {
        $domData = json_decode($domRes['body'], true);
        if (isset($domData['data'])) {
            $domain = rtrim($domData['data'], '/');
        }
    }
    
    $isMovie = $mediaType === 'movie';
    $querySe = $isMovie ? 0 : $actualSeason;
    $queryEp = $isMovie ? 0 : $episode;
    
    $playerReferer = "$domain/spa/videoPlayPage/movies/$detailPath?id=$subjectId&type=/movie/detail&detailSe=$querySe&detailEp=$queryEp&lang=en";
    $playUrl = "$domain/wefeed-h5api-bff/subject/play?subjectId=$subjectId&se=$querySe&ep=$queryEp&detailPath=" . urlencode($detailPath);
    
    $playRes = makeRequest($playUrl, "GET", null, [
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        "Accept: application/json",
        "Accept-Language: en-US,en;q=0.9",
        "Cache-Control: no-cache",
        "Pragma: no-cache",
        "X-Client-Info: {\"timezone\":\"Asia/Dhaka\"}",
        "X-Source: ",
        "Referer: $playerReferer",
        "Authorization: Bearer $token"
    ]);
    
    if ($playRes['code'] !== 200) {
        echo json_encode(["error" => "Netfilm player request failed with status " . $playRes['code']]);
        exit(502);
    }
    
    $playData = json_decode($playRes['body'], true);
    $streamsData = isset($playData['data']) ? $playData['data'] : [];
    
    $rawStreams = isset($streamsData['streams']) ? $streamsData['streams'] : [];
    $hlsList = isset($streamsData['hls']) ? $streamsData['hls'] : [];
    $dashList = isset($streamsData['dash']) ? $streamsData['dash'] : [];
    
    $streams = [];
    foreach ($rawStreams as $s) {
        $streams[] = [
            "resolution" => isset($s['resolutions']) ? $s['resolutions'] . "p" : "",
            "format" => isset($s['format']) ? $s['format'] : "",
            "url" => isset($s['url']) ? $s['url'] : "",
            "size" => isset($s['size']) ? $s['size'] : "",
            "duration" => isset($s['duration']) ? $s['duration'] : "",
            "codec" => isset($s['codecName']) ? $s['codecName'] : "",
            "vipLocked" => isset($s['vipLocked']) ? (bool)$s['vipLocked'] : false
        ];
    }
    
    $hls = [];
    foreach ($hlsList as $s) {
        $hls[] = [
            "resolution" => isset($s['resolutions']) ? $s['resolutions'] . "p" : "",
            "format" => isset($s['format']) ? $s['format'] : "",
            "url" => isset($s['url']) ? $s['url'] : "",
            "vipLocked" => isset($s['vipLocked']) ? (bool)$s['vipLocked'] : false
        ];
    }
    
    $dash = [];
    foreach ($dashList as $s) {
        $dash[] = [
            "resolution" => isset($s['resolutions']) ? $s['resolutions'] . "p" : "",
            "format" => isset($s['format']) ? $s['format'] : "",
            "url" => isset($s['url']) ? $s['url'] : "",
            "vipLocked" => isset($s['vipLocked']) ? (bool)$s['vipLocked'] : false
        ];
    }
    
    $captions = [];
    $streamId = null;
    $streamFormat = "MP4";
    
    if (count($rawStreams) > 0) {
        $streamId = $rawStreams[0]['id'];
        $streamFormat = isset($rawStreams[0]['format']) ? $rawStreams[0]['format'] : "MP4";
    } else if (count($dashList) > 0) {
        $streamId = $dashList[0]['id'];
        $streamFormat = isset($dashList[0]['format']) ? $dashList[0]['format'] : "DASH";
    } else if (count($hlsList) > 0) {
        $streamId = $hlsList[0]['id'];
        $streamFormat = isset($hlsList[0]['format']) ? $hlsList[0]['format'] : "HLS";
    }
    
    if ($streamId) {
        $captionUrl = "$API_BASE/subject/caption?format=$streamFormat&id=$streamId&subjectId=$subjectId&detailPath=" . urlencode($detailPath);
        $capRes = makeRequest($captionUrl, "GET", null, $authHeaders);
        if ($capRes['code'] === 200) {
            $capData = json_decode($capRes['body'], true);
            $list = isset($capData['data']['captions']) ? $capData['data']['captions'] : (isset($capData['data']) ? $capData['data'] : []);
            if (is_array($list)) {
                foreach ($list as $c) {
                    $captions[] = [
                        "id" => isset($c['id']) ? $c['id'] : null,
                        "languageCode" => isset($c['lan']) ? $c['lan'] : "",
                        "language" => isset($c['lanName']) ? $c['lanName'] : "",
                        "url" => isset($c['url']) ? $c['url'] : ""
                    ];
                }
            }
        }
    }
    
    $responseData = [
        "title" => $matchedItem['title'],
        "subjectId" => $subjectId,
        "detailPath" => $detailPath,
        "hasResource" => isset($streamsData['hasResource']) ? (bool)$streamsData['hasResource'] : false,
        "streams" => $streams,
        "hls" => $hls,
        "dash" => $dash,
        "captions" => $captions,
        "availableDubs" => $availableDubs
    ];
    
    echo json_encode($responseData);
    
} catch (Exception $e) {
    echo json_encode(["error" => "Internal Server Error", "details" => $e->getMessage()]);
    exit(500);
}
