use base64::Engine;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha1 = Hmac<Sha1>;

// ─── ACRCloud Song Recognition ──────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct RecognizedSong {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_art: Option<String>,
}

#[derive(Deserialize)]
struct AcrStatus {
    code: i32,
    msg: String,
}

#[derive(Deserialize)]
struct AcrArtist {
    name: String,
}

#[derive(Deserialize)]
struct AcrAlbum {
    name: String,
}

#[derive(Deserialize)]
struct AcrExternalMetadata {
    spotify: Option<AcrSpotify>,
}

#[derive(Deserialize)]
struct AcrSpotify {
    album: Option<AcrSpotifyAlbum>,
}

#[derive(Deserialize)]
struct AcrSpotifyAlbum {
    images: Option<Vec<AcrImage>>,
}

#[derive(Deserialize)]
struct AcrImage {
    url: String,
}

#[derive(Deserialize)]
struct AcrMusic {
    title: String,
    artists: Vec<AcrArtist>,
    album: AcrAlbum,
    external_metadata: Option<AcrExternalMetadata>,
}

#[derive(Deserialize)]
struct AcrMetadata {
    music: Vec<AcrMusic>,
}

#[derive(Deserialize)]
struct AcrResponse {
    status: AcrStatus,
    metadata: Option<AcrMetadata>,
}

#[tauri::command]
pub async fn recognize_song(
    audio_base64: String,
    host: String,
    access_key: String,
    access_secret: String,
) -> Result<RecognizedSong, String> {
    let audio_bytes = base64::engine::general_purpose::STANDARD
        .decode(&audio_base64)
        .map_err(|e| format!("Failed to decode audio: {}", e))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        .to_string();

    let http_method = "POST";
    let http_uri = "/v1/identify";
    let data_type = "audio";
    let signature_version = "1";

    let string_to_sign = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        http_method, http_uri, access_key, data_type, signature_version, timestamp
    );

    let mut mac = HmacSha1::new_from_slice(access_secret.as_bytes())
        .map_err(|e| format!("HMAC error: {}", e))?;
    mac.update(string_to_sign.as_bytes());
    let signature = base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes());

    let form = reqwest::multipart::Form::new()
        .text("access_key", access_key.clone())
        .text("data_type", data_type.to_string())
        .text("signature_version", signature_version.to_string())
        .text("signature", signature)
        .text("sample_bytes", audio_bytes.len().to_string())
        .text("timestamp", timestamp)
        .part(
            "sample",
            reqwest::multipart::Part::bytes(audio_bytes).file_name("audio.wav"),
        );

    let url = format!("https://{}/v1/identify", host);
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let acr: AcrResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if acr.status.code != 0 {
        return Err(format!("Recognition failed: {}", acr.status.msg));
    }

    let metadata = acr.metadata.ok_or("No metadata in response")?;
    let music = metadata.music.first().ok_or("No music matches found")?;

    let album_art = music
        .external_metadata
        .as_ref()
        .and_then(|em| em.spotify.as_ref())
        .and_then(|s| s.album.as_ref())
        .and_then(|a| a.images.as_ref())
        .and_then(|imgs| imgs.first())
        .map(|img| img.url.clone());

    Ok(RecognizedSong {
        title: music.title.clone(),
        artist: music.artists.iter().map(|a| a.name.clone()).collect::<Vec<_>>().join(", "),
        album: music.album.name.clone(),
        album_art,
    })
}

// ─── Lyrics: Shared Types ──────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct LyricLine {
    pub time: f64,
    pub text: String,
}

#[derive(Serialize, Deserialize)]
pub struct LyricsResult {
    pub lines: Vec<LyricLine>,
    pub synced: bool,
}

// ─── lrclib.net (Primary) ──────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LrclibResponse {
    synced_lyrics: Option<String>,
    plain_lyrics: Option<String>,
}

#[tauri::command]
pub async fn fetch_lyrics_lrclib(
    title: String,
    artist: String,
    album: Option<String>,
) -> Result<LyricsResult, String> {
    let client = reqwest::Client::new();

    let mut url = format!(
        "https://lrclib.net/api/get?artist_name={}&track_name={}",
        urlencoded(&artist),
        urlencoded(&title),
    );
    if let Some(ref album_name) = album {
        if !album_name.is_empty() && album_name != "Imported" {
            url.push_str(&format!("&album_name={}", urlencoded(album_name)));
        }
    }

    let resp = client
        .get(&url)
        .header("User-Agent", "KaraLingo/0.1.0 (https://github.com/karalingo)")
        .send()
        .await
        .map_err(|e| format!("lrclib request failed: {}", e))?;

    if resp.status() == 404 {
        return Err("No lyrics found on lrclib".to_string());
    }

    if !resp.status().is_success() {
        return Err(format!("lrclib returned status {}", resp.status()));
    }

    let data: LrclibResponse = resp
        .json()
        .await
        .map_err(|e| format!("lrclib parse error: {}", e))?;

    // Try synced lyrics first (LRC format)
    if let Some(synced) = data.synced_lyrics {
        let lines = parse_lrc(&synced);
        if !lines.is_empty() {
            return Ok(LyricsResult { lines, synced: true });
        }
    }

    // Fall back to plain lyrics
    if let Some(plain) = data.plain_lyrics {
        let lines: Vec<LyricLine> = plain
            .lines()
            .filter(|l| !l.trim().is_empty())
            .enumerate()
            .map(|(i, line)| LyricLine {
                time: i as f64 * -1.0, // negative = no real timestamp
                text: line.to_string(),
            })
            .collect();

        if !lines.is_empty() {
            return Ok(LyricsResult {
                lines,
                synced: false,
            });
        }
    }

    Err("lrclib returned empty lyrics".to_string())
}

/// Parse LRC format: [mm:ss.xx]text
fn parse_lrc(lrc: &str) -> Vec<LyricLine> {
    let mut lines = Vec::new();
    let re_pattern = regex_lite::Regex::new(r"\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)").unwrap();

    for raw in lrc.lines() {
        if let Some(caps) = re_pattern.captures(raw) {
            let minutes: f64 = caps[1].parse().unwrap_or(0.0);
            let seconds: f64 = caps[2].parse().unwrap_or(0.0);
            let ms_str = &caps[3];
            let ms: f64 = if ms_str.len() == 2 {
                ms_str.parse::<f64>().unwrap_or(0.0) * 10.0
            } else {
                ms_str.parse().unwrap_or(0.0)
            };
            let time = minutes * 60.0 + seconds + ms / 1000.0;
            let text = caps[4].trim().to_string();
            if !text.is_empty() {
                lines.push(LyricLine { time, text });
            }
        }
    }

    lines.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap());
    lines
}

// ─── Genius API (Secondary) ────────────────────────────────────────

#[derive(Deserialize)]
struct GeniusSearchResponse {
    response: GeniusResponseBody,
}

#[derive(Deserialize)]
struct GeniusResponseBody {
    hits: Vec<GeniusHit>,
}

#[derive(Deserialize)]
struct GeniusHit {
    result: GeniusResult,
}

#[derive(Deserialize)]
struct GeniusResult {
    url: String,
    full_title: String,
}

#[tauri::command]
pub async fn fetch_lyrics_genius(
    title: String,
    artist: String,
    api_key: String,
) -> Result<LyricsResult, String> {
    let client = reqwest::Client::new();

    // Search for the song
    let search_url = format!(
        "https://api.genius.com/search?q={}",
        urlencoded(&format!("{} {}", title, artist)),
    );

    let resp = client
        .get(&search_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Genius search failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Genius returned status {}", resp.status()));
    }

    let data: GeniusSearchResponse = resp
        .json()
        .await
        .map_err(|e| format!("Genius parse error: {}", e))?;

    let hit = data
        .response
        .hits
        .first()
        .ok_or("No results found on Genius")?;

    let song_url = &hit.result.url;

    // Scrape lyrics from the Genius page
    let page = client
        .get(song_url)
        .header("User-Agent", "KaraLingo/0.1.0")
        .send()
        .await
        .map_err(|e| format!("Genius page fetch failed: {}", e))?;

    let html = page
        .text()
        .await
        .map_err(|e| format!("Genius page read error: {}", e))?;

    let lyrics_text = extract_genius_lyrics(&html)
        .ok_or("Could not extract lyrics from Genius page")?;

    let lines: Vec<LyricLine> = lyrics_text
        .lines()
        .filter(|l| {
            let trimmed = l.trim();
            !trimmed.is_empty() && !trimmed.starts_with('[')
        })
        .enumerate()
        .map(|(i, line)| LyricLine {
            time: i as f64 * -1.0, // no timestamps from Genius
            text: line.trim().to_string(),
        })
        .collect();

    if lines.is_empty() {
        return Err("Genius returned empty lyrics".to_string());
    }

    log::info!(
        "Genius: found {} lines for \"{}\" ({})",
        lines.len(),
        hit.result.full_title,
        song_url
    );

    Ok(LyricsResult {
        lines,
        synced: false,
    })
}

/// Extract lyrics text from Genius HTML.
/// Genius wraps lyrics in <div data-lyrics-container="true"> elements.
fn extract_genius_lyrics(html: &str) -> Option<String> {
    let mut result = String::new();
    let marker = "data-lyrics-container=\"true\"";

    for (idx, _) in html.match_indices(marker) {
        // Find the closing > of this opening tag
        let tag_end = html[idx..].find('>')? + idx + 1;
        // Find the matching </div>
        let mut depth = 1;
        let mut pos = tag_end;
        let bytes = html.as_bytes();
        while pos < bytes.len() && depth > 0 {
            if pos + 5 < bytes.len() && &html[pos..pos + 4] == "<div" {
                depth += 1;
            } else if pos + 6 < bytes.len() && &html[pos..pos + 6] == "</div>" {
                depth -= 1;
                if depth == 0 {
                    break;
                }
            }
            pos += 1;
        }

        let fragment = &html[tag_end..pos];
        // Strip HTML tags, convert <br> to newlines
        let cleaned = fragment
            .replace("<br>", "\n")
            .replace("<br/>", "\n")
            .replace("<br />", "\n");

        // Remove remaining HTML tags
        let mut text = String::new();
        let mut inside_tag = false;
        for ch in cleaned.chars() {
            match ch {
                '<' => inside_tag = true,
                '>' => inside_tag = false,
                _ if !inside_tag => text.push(ch),
                _ => {}
            }
        }

        if !text.trim().is_empty() {
            if !result.is_empty() {
                result.push('\n');
            }
            result.push_str(text.trim());
        }
    }

    if result.is_empty() {
        None
    } else {
        // Decode common HTML entities
        let decoded = result
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&#x27;", "'")
            .replace("&quot;", "\"")
            .replace("&#39;", "'");
        Some(decoded)
    }
}

fn urlencoded(s: &str) -> String {
    s.replace(' ', "+")
        .replace('&', "%26")
        .replace('?', "%3F")
        .replace('#', "%23")
}

// ─── LibreTranslate ────────────────────────────────────────────────

#[derive(Serialize)]
struct TranslateRequest {
    q: String,
    source: String,
    target: String,
}

#[derive(Deserialize)]
struct TranslateResponse {
    #[serde(alias = "translatedText")]
    translated_text: String,
}

#[derive(Deserialize)]
struct DetectResponse {
    #[serde(default)]
    confidence: f64,
    language: String,
}

#[derive(Deserialize)]
struct LibreTranslateError {
    error: String,
}

#[tauri::command]
pub async fn translate_text(
    texts: Vec<String>,
    source_lang: String,
    target_lang: String,
    api_url: String,
) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let mut translations = Vec::new();

    // Batch texts to reduce API calls (join with newline delimiter)
    let batch_size = 20;
    for chunk in texts.chunks(batch_size) {
        let combined = chunk.join("\n");
        let body = TranslateRequest {
            q: combined,
            source: source_lang.clone(),
            target: target_lang.clone(),
        };

        let resp = client
            .post(format!("{}/translate", api_url.trim_end_matches('/')))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Translation request failed: {}", e))?;

        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| format!("Translation read error: {}", e))?;

        if !status.is_success() {
            if let Ok(err) = serde_json::from_str::<LibreTranslateError>(&text) {
                return Err(format!("LibreTranslate error: {}", err.error));
            }
            return Err(format!("LibreTranslate returned status {}", status));
        }

        let result: TranslateResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Translation parse error: {}", e))?;

        for line in result.translated_text.split('\n') {
            translations.push(line.to_string());
        }
    }

    Ok(translations)
}

#[tauri::command]
pub async fn detect_language(text: String, api_url: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({ "q": text });

    let resp = client
        .post(format!("{}/detect", api_url.trim_end_matches('/')))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Detection request failed: {}", e))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Detection read error: {}", e))?;

    if !status.is_success() {
        if let Ok(err) = serde_json::from_str::<LibreTranslateError>(&text) {
            return Err(format!("LibreTranslate error: {}", err.error));
        }
        return Err(format!("LibreTranslate returned status {}", status));
    }

    let results: Vec<DetectResponse> = serde_json::from_str(&text)
        .map_err(|e| format!("Detection parse error: {}", e))?;

    results
        .into_iter()
        .max_by(|a, b| a.confidence.partial_cmp(&b.confidence).unwrap())
        .map(|r| r.language)
        .ok_or_else(|| "Could not detect language".to_string())
}

// ─── Sidecar Commands ──────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct DemucsResult {
    pub instrumental_path: String,
    pub vocals_path: String,
}

#[tauri::command]
pub async fn run_demucs(audio_path: String) -> Result<DemucsResult, String> {
    let output = tokio::process::Command::new("python3")
        .arg("sidecar/demucs_runner.py")
        .arg(&audio_path)
        .output()
        .await
        .map_err(|e| format!("Failed to run Demucs: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Demucs error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: DemucsResult =
        serde_json::from_str(&stdout).map_err(|e| format!("Parse demucs output: {}", e))?;

    Ok(result)
}

#[derive(Serialize, Deserialize)]
pub struct WhisperLine {
    pub time: f64,
    pub text: String,
}

#[tauri::command]
pub async fn run_whisper(audio_path: String) -> Result<Vec<WhisperLine>, String> {
    let output = tokio::process::Command::new("python3")
        .arg("sidecar/whisper_runner.py")
        .arg(&audio_path)
        .output()
        .await
        .map_err(|e| format!("Failed to run Whisper: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Whisper error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<WhisperLine> =
        serde_json::from_str(&stdout).map_err(|e| format!("Parse whisper output: {}", e))?;

    Ok(lines)
}
