<?php
// Disable output buffering
while (ob_get_level() > 0) {
    ob_end_clean();
}

$targetUrl = isset($_GET['url']) ? $_GET['url'] : '';
if (!$targetUrl) {
    header("HTTP/1.1 400 Bad Request");
    echo "Missing url parameter";
    exit;
}

$parsedTarget = parse_url($targetUrl);
if (!$parsedTarget || !isset($parsedTarget['host'])) {
    header("HTTP/1.1 400 Bad Request");
    echo "Invalid url parameter";
    exit;
}

$protocol = isset($parsedTarget['scheme']) ? strtolower($parsedTarget['scheme']) : '';
if ($protocol !== 'http' && $protocol !== 'https') {
    header("HTTP/1.1 403 Forbidden");
    echo "Forbidden protocol";
    exit;
}

$hostname = strtolower($parsedTarget['host']);
$isAllowed = false;

$allowedDomains = ['aoneroom.com', 'netfilm.world', 'hakunaymatata.com'];
foreach ($allowedDomains as $domain) {
    if ($hostname === $domain || substr($hostname, -strlen('.' . $domain)) === '.' . $domain) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    header("HTTP/1.1 403 Forbidden");
    echo "Forbidden target domain";
    exit;
}

// Determine Referer
$refererHost = "https://netfilm.world/";
if (strpos($hostname, 'aoneroom') !== false) {
    $refererHost = "https://h5.aoneroom.com/";
}

$headers = [
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept: */*",
    "Referer: $refererHost"
];

// Forward Range header if present
if (isset($_SERVER['HTTP_RANGE'])) {
    $headers[] = "Range: " . $_SERVER['HTTP_RANGE'];
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 0); // Disable timeout for long video stream requests
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Buffer headers to send them before the body
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) {
    $len = strlen($header);
    $parts = explode(':', $header, 2);
    if (count($parts) >= 2) {
        $key = strtolower(trim($parts[0]));
        $val = trim($parts[1]);
        $copyHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
        if (in_array($key, $copyHeaders)) {
            header("$key: $val");
        }
    }
    return $len;
});

// Stream body chunk by chunk
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($curl, $data) {
    echo $data;
    flush();
    return strlen($data);
});

curl_exec($ch);
curl_close($ch);
