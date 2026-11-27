use crate::state::AppState;
use std::time::Duration;
use tauri::State;

#[derive(serde::Deserialize)]
pub struct AiChatMessageInput {
    pub role: String,
    pub content: String,
}

fn build_models_request(
    client: &reqwest::Client,
    provider: &str,
    key: &str,
    base_url: Option<String>,
) -> Result<reqwest::RequestBuilder, String> {
    match provider {
        "openai" => {
            if key.is_empty() {
                return Err("La API Key de OpenAI es obligatoria.".to_string());
            }
            Ok(client
                .get("https://api.openai.com/v1/models")
                .bearer_auth(key))
        }
        "anthropic" => {
            if key.is_empty() {
                return Err("La API Key de Claude (Anthropic) es obligatoria.".to_string());
            }
            Ok(client
                .get("https://api.anthropic.com/v1/models")
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01"))
        }
        "gemini" => {
            if key.is_empty() {
                return Err("La API Key de Google Gemini es obligatoria.".to_string());
            }
            Ok(client
                .get("https://generativelanguage.googleapis.com/v1beta/models")
                .header("x-goog-api-key", key))
        }
        "custom" => {
            let raw_base = base_url.unwrap_or_default();
            let trimmed_base = raw_base.trim().trim_end_matches('/');
            let parsed = tauri::Url::parse(trimmed_base)
                .map_err(|_| "URL base personalizada inválida.".to_string())?;
            if parsed.scheme() != "https" && parsed.scheme() != "http" {
                return Err("La URL base debe usar https:// o http://".to_string());
            }
            let endpoint = format!("{}/models", trimmed_base);
            let mut r = client.get(&endpoint);
            if !key.is_empty() {
                r = r.bearer_auth(key);
            }
            Ok(r)
        }
        _ => Err("Proveedor de IA no reconocido.".to_string()),
    }
}

fn format_reqwest_error(err: &reqwest::Error) -> String {
    let mut parts = vec![err.to_string()];
    let mut current: Option<&dyn std::error::Error> = std::error::Error::source(err);
    while let Some(src) = current {
        parts.push(src.to_string());
        current = src.source();
    }
    if err.is_timeout() {
        format!("Tiempo de espera agotado: {}", parts.join(" -> "))
    } else {
        parts.join(" -> ")
    }
}

#[tauri::command]
pub async fn test_ai_provider(
    state: State<'_, AppState>,
    provider: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<String, String> {
    let key = api_key.trim();
    let req = build_models_request(&state.http, provider.as_str(), key, base_url)?
        .timeout(Duration::from_secs(12));

    let res = req
        .send()
        .await
        .map_err(|e| format!("Error conectando con el proveedor de IA: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("El proveedor respondió HTTP {}: {}", status, text));
    }

    Ok(format!("Conexión verificada correctamente con {}.", provider))
}

#[tauri::command]
pub async fn list_ai_models(
    state: State<'_, AppState>,
    provider: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<Vec<String>, String> {
    let key = api_key.trim();
    let req = build_models_request(&state.http, provider.as_str(), key, base_url)?
        .timeout(Duration::from_secs(15));
    let res = req
        .send()
        .await
        .map_err(|e| format!("Error consultando modelos disponibles: {}", e))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format!("El proveedor respondió HTTP {}: {}", status, text));
    }

    let json: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Respuesta JSON inválida: {}", e))?;

    let mut models: Vec<String> = Vec::new();
    if provider == "gemini" {
        if let Some(arr) = json.get("models").and_then(|v| v.as_array()) {
            for item in arr {
                let supports_gen = item
                    .get("supportedGenerationMethods")
                    .and_then(|m| m.as_array())
                    .map(|methods| {
                        methods
                            .iter()
                            .any(|m| m.as_str() == Some("generateContent"))
                    })
                    .unwrap_or(true);
                if !supports_gen {
                    continue;
                }
                if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                    let clean = name.strip_prefix("models/").unwrap_or(name).trim();
                    if !clean.is_empty() {
                        models.push(clean.to_string());
                    }
                }
            }
        }
    } else if let Some(arr) = json.get("data").and_then(|v| v.as_array()) {
        for item in arr {
            if let Some(id) = item.get("id").and_then(|v| v.as_str()) {
                let clean = id.trim();
                if !clean.is_empty() {
                    models.push(clean.to_string());
                }
            }
        }
    } else if let Some(arr) = json.get("models").and_then(|v| v.as_array()) {
        for item in arr {
            let name = item
                .get("id")
                .or_else(|| item.get("name"))
                .or_else(|| item.get("model"))
                .and_then(|v| v.as_str());
            if let Some(raw) = name {
                let clean = raw.trim();
                if !clean.is_empty() {
                    models.push(clean.to_string());
                }
            }
        }
    }

    models.sort();
    models.dedup();
    Ok(models)
}

#[tauri::command]
pub async fn ai_chat_completion(
    state: State<'_, AppState>,
    provider: String,
    api_key: String,
    messages: Vec<AiChatMessageInput>,
    base_url: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let key = api_key.trim();

    let system_text = messages
        .iter()
        .filter(|m| m.role == "system")
        .map(|m| m.content.as_str())
        .collect::<Vec<_>>()
        .join("\n");

    let non_system: Vec<&AiChatMessageInput> =
        messages.iter().filter(|m| m.role != "system").collect();

    match provider.as_str() {
        "openai" | "custom" => {
            let endpoint = if provider == "openai" {
                if key.is_empty() {
                    return Err("Falta la API Key de OpenAI en Cuenta -> Inteligencia Artificial.".to_string());
                }
                "https://api.openai.com/v1/chat/completions".to_string()
            } else {
                let raw = base_url.unwrap_or_default();
                let trimmed = raw.trim().trim_end_matches('/');
                let parsed = tauri::Url::parse(trimmed)
                    .map_err(|_| "Base URL personalizada inválida.".to_string())?;
                if parsed.scheme() != "https" && parsed.scheme() != "http" {
                    return Err("La URL base debe usar https:// o http://".to_string());
                }
                format!("{}/chat/completions", trimmed)
            };

            let chosen_model = model
                .filter(|m| !m.trim().is_empty())
                .unwrap_or_else(|| "gpt-4o-mini".to_string());

            let api_msgs: Vec<serde_json::Value> = messages
                .iter()
                .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
                .collect();

            let body = serde_json::json!({
                "model": chosen_model,
                "messages": api_msgs,
                "temperature": 0.4
            });

            let mut req = state
                .http
                .post(&endpoint)
                .header("Content-Type", "application/json")
                .body(body.to_string());
            if !key.is_empty() {
                req = req.bearer_auth(key);
            }

            let res = req.send().await.map_err(|e| e.to_string())?;
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            if !status.is_success() {
                return Err(format!("Error IA HTTP {}: {}", status, text));
            }
            let json: serde_json::Value =
                serde_json::from_str(&text).map_err(|e| e.to_string())?;
            json.get("choices")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("message"))
                .and_then(|m| m.get("content"))
                .and_then(|s| s.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "Respuesta inesperada del proveedor IA.".to_string())
        }
        "anthropic" => {
            if key.is_empty() {
                return Err("Falta la API Key de Claude (Anthropic).".to_string());
            }
            let chosen_model = model
                .filter(|m| !m.trim().is_empty())
                .unwrap_or_else(|| "claude-3-5-sonnet-latest".to_string());
            let api_msgs: Vec<serde_json::Value> = non_system
                .iter()
                .map(|m| {
                    serde_json::json!({
                        "role": if m.role == "assistant" { "assistant" } else { "user" },
                        "content": m.content
                    })
                })
                .collect();

            let body = serde_json::json!({
                "model": chosen_model,
                "max_tokens": 1024,
                "system": system_text,
                "messages": api_msgs
            });

            let res = state
                .http
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .body(body.to_string())
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            if !status.is_success() {
                return Err(format!("Error Claude HTTP {}: {}", status, text));
            }
            let json: serde_json::Value =
                serde_json::from_str(&text).map_err(|e| e.to_string())?;
            json.get("content")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("text"))
                .and_then(|s| s.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "Respuesta inesperada de Claude.".to_string())
        }
        "gemini" => {
            if key.is_empty() {
                return Err("Falta la API Key de Google Gemini.".to_string());
            }
            let chosen_model = model
                .filter(|m| !m.trim().is_empty())
                .unwrap_or_else(|| "gemini-3.8-flash".to_string());
            let contents: Vec<serde_json::Value> = non_system
                .iter()
                .map(|m| {
                    serde_json::json!({
                        "role": if m.role == "assistant" { "model" } else { "user" },
                        "parts": [{ "text": m.content }]
                    })
                })
                .collect();

            let body = serde_json::json!({
                "system_instruction": { "parts": [{ "text": system_text }] },
                "contents": contents
            });

            let endpoint = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
                chosen_model
            );
            let res = state
                .http
                .post(&endpoint)
                .header("x-goog-api-key", key)
                .header("Content-Type", "application/json")
                .body(body.to_string())
                .send()
                .await
                .map_err(|e| format_reqwest_error(&e))?;

            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            if !status.is_success() {
                return Err(format!("Error Gemini HTTP {}: {}", status, text));
            }
            let json: serde_json::Value =
                serde_json::from_str(&text).map_err(|e| e.to_string())?;
            json.get("candidates")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("content"))
                .and_then(|c| c.get("parts"))
                .and_then(|p| p.get(0))
                .and_then(|p| p.get("text"))
                .and_then(|s| s.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "Respuesta inesperada de Gemini.".to_string())
        }
        _ => Err("Proveedor de IA no soportado.".to_string()),
    }
}
