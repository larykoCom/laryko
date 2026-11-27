use crate::state::AppState;
use std::time::Duration;
use tauri::State;

async fn send_email_internal(
    http: &reqwest::Client,
    provider_name: &str,
    endpoint_url: &str,
    api_key: &str,
    from_email: &str,
    to_email: &str,
    subject: &str,
    html: &str,
) -> Result<String, String> {
    let raw_url = endpoint_url.trim();
    let parsed = tauri::Url::parse(raw_url)
        .map_err(|_| "URL del Endpoint Email API inválida.".to_string())?;
    if !matches!(parsed.scheme(), "https" | "http") {
        return Err("El endpoint debe usar https:// o http://.".to_string());
    }

    let to = to_email.trim();
    if !to.contains('@') {
        return Err("Ingresa un correo destinatario válido.".to_string());
    }

    let from = if from_email.trim().is_empty() {
        to
    } else {
        from_email.trim()
    };

    let key = api_key.trim();
    let mut req = http
        .post(parsed)
        .timeout(Duration::from_secs(15))
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .body(
            serde_json::json!({
                "from": from,
                "to": [to],
                "subject": subject,
                "html": html
            })
            .to_string(),
        );

    if !key.is_empty() {
        req = req.bearer_auth(key);
    }

    let label = if provider_name.trim().is_empty() {
        "Email API"
    } else {
        provider_name.trim()
    };

    let res = req
        .send()
        .await
        .map_err(|e| format!("Error conectando con {}: {}", label, e))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("{} respondió HTTP {}: {}", label, status, text));
    }

    Ok(format!("Correo enviado correctamente vía {}.", label))
}

#[tauri::command]
pub async fn send_resend_email(
    state: State<'_, AppState>,
    provider: Option<String>,
    custom_endpoint: Option<String>,
    api_key: String,
    from_email: String,
    to_email: String,
    subject: String,
    html: String,
) -> Result<String, String> {
    send_email_internal(
        &state.http,
        provider.as_deref().unwrap_or(""),
        custom_endpoint.as_deref().unwrap_or(""),
        &api_key,
        &from_email,
        &to_email,
        &subject,
        &html,
    )
    .await
}

#[tauri::command]
pub async fn test_resend_connection(
    state: State<'_, AppState>,
    provider: Option<String>,
    custom_endpoint: Option<String>,
    api_key: String,
    from_email: String,
    to_email: String,
) -> Result<String, String> {
    let label = provider
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("Email API");
    send_email_internal(
        &state.http,
        label,
        custom_endpoint.as_deref().unwrap_or(""),
        &api_key,
        &from_email,
        &to_email,
        &format!("Laryko — Prueba de conexión ({})", label),
        &format!(
            "<p>Tu integración de correo con <strong>{}</strong> en Laryko está funcionando correctamente.</p>",
            label
        ),
    )
    .await
}

#[tauri::command]
pub async fn test_r2_endpoint(
    state: State<'_, AppState>,
    account_id: String,
    bucket_name: String,
) -> Result<String, String> {
    let acc = account_id.trim();
    let bucket = bucket_name.trim();
    if acc.is_empty() || !acc.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err("Account ID de Cloudflare R2 inválido.".to_string());
    }
    if bucket.is_empty()
        || !bucket
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '.')
    {
        return Err("Nombre de bucket R2 inválido.".to_string());
    }

    let url = format!("https://{}.r2.cloudflarestorage.com/{}", acc, bucket);
    let res = state
        .http
        .head(&url)
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("No se pudo alcanzar el endpoint R2: {}", e))?;

    let code = res.status().as_u16();
    if code == 200 || code == 400 || code == 403 {
        return Ok(format!("Endpoint R2 alcanzable (HTTP {}).", code));
    }
    Err(format!("Endpoint R2 devolvió HTTP {}.", code))
}
