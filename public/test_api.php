<?php
header("Content-Type: text/plain");

$API_BASE = "https://h5-api.aoneroom.com/wefeed-h5api-bff";

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
        $parts = explode(':', $header, 2);
        if (count($parts) >= 2) {
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
        }
        return strlen($header);
    });
    
    $body = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'body' => $body,
        'err' => $err,
        'headers' => $responseHeaders
    ];
}

echo "=== STEP 1: Fetching Bearer Token ===\n";
$headers = [
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Referer: https://moviebox.ph/",
    "Origin: https://moviebox.ph",
    "X-Client-Info: {\"timezone\":\"Asia/Dhaka\"}",
    "X-Request-Lang: en",
    "Accept: application/json",
    "Content-Type: application/json"
];

$res = makeRequest("$API_BASE/home?host=moviebox.ph", "GET", null, $headers);
echo "Home HTTP Code: " . $res['code'] . "\n";
if ($res['err']) {
    echo "Home Error: " . $res['err'] . "\n";
    exit;
}

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

if (!$token) {
    echo "Failed to retrieve token from home response headers.\n";
    echo "Headers:\n" . print_r($res['headers'], true) . "\n";
    exit;
}
echo "Token: " . substr($token, 0, 15) . "...\n\n";

echo "=== STEP 2: Searching for Movie 'Avatar' ===\n";
$authHeaders = array_merge($headers, ["Authorization: Bearer $token"]);
$searchRes = makeRequest("$API_BASE/subject/search", "POST", [
    "keyword" => "Avatar",
    "page" => 1,
    "perPage" => 5
], $authHeaders);

echo "Search HTTP Code: " . $searchRes['code'] . "\n";
$searchData = json_decode($searchRes['body'], true);
$items = $searchData['data']['items'] ?? $searchData['data']['list'] ?? [];
if (empty($items)) {
    echo "No search results found.\n";
    echo "Search Body: " . $searchRes['body'] . "\n";
    exit;
}

$item = $items[0];
$subjectId = $item['subjectId'];
$detailPath = $item['detailPath'];
echo "Matched Item: " . $item['title'] . " (ID: $subjectId, Path: $detailPath)\n\n";

echo "=== STEP 3: Querying Player Domain ===\n";
$domRes = makeRequest("$API_BASE/media-player/get-domain", "GET", null, $authHeaders);
echo "Get-Domain HTTP Code: " . $domRes['code'] . "\n";
$domData = json_decode($domRes['body'], true);
$domain = ($domData['data'] ?? "https://netfilm.world");
echo "Reported Domain: $domain\n\n";

$playQuery = "subjectId=$subjectId&se=0&ep=0&detailPath=" . urlencode($detailPath);

// Target 1: Dynamic Domain (Netfilm)
$url1 = "$domain/wefeed-h5api-bff/subject/play?$playQuery";
$referer1 = "$domain/spa/videoPlayPage/movies/$detailPath?id=$subjectId&type=/movie/detail&detailSe=0&detailEp=0&lang=en";
echo "=== TARGET 1: Netfilm ($url1) ===\n";
$playRes1 = makeRequest($url1, "GET", null, [
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept: application/json",
    "Referer: $referer1",
    "Authorization: Bearer $token"
]);
echo "Netfilm Code: " . $playRes1['code'] . "\n";
if ($playRes1['err']) echo "Netfilm Err: " . $playRes1['err'] . "\n";
echo "Netfilm Body Snippet: " . substr($playRes1['body'], 0, 300) . "\n\n";

// Target 2: h5-api.aoneroom.com
$url2 = "$API_BASE/subject/play?$playQuery";
$referer2 = "https://h5.aoneroom.com/spa/videoPlayPage/movies/$detailPath?id=$subjectId&type=/movie/detail&detailSe=0&detailEp=0&lang=en";
echo "=== TARGET 2: h5-api.aoneroom.com ($url2) ===\n";
$playRes2 = makeRequest($url2, "GET", null, [
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept: application/json",
    "Referer: $referer2",
    "Authorization: Bearer $token"
]);
echo "Aoneroom Code: " . $playRes2['code'] . "\n";
if ($playRes2['err']) echo "Aoneroom Err: " . $playRes2['err'] . "\n";
echo "Aoneroom Body Snippet: " . substr($playRes2['body'], 0, 300) . "\n\n";

// Target 3: moviebox.ph
$url3 = "https://moviebox.ph/wefeed-h5api-bff/subject/play?$playQuery";
$referer3 = "https://moviebox.ph/spa/videoPlayPage/movies/$detailPath?id=$subjectId&type=/movie/detail&detailSe=0&detailEp=0&lang=en";
echo "=== TARGET 3: moviebox.ph ($url3) ===\n";
$playRes3 = makeRequest($url3, "GET", null, [
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept: application/json",
    "Referer: $referer3",
    "Authorization: Bearer $token"
]);
echo "MovieBox.ph Code: " . $playRes3['code'] . "\n";
if ($playRes3['err']) echo "MovieBox.ph Err: " . $playRes3['err'] . "\n";
echo "MovieBox.ph Body Snippet: " . substr($playRes3['body'], 0, 300) . "\n\n";
