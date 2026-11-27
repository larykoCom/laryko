use crate::state::AppState;
use std::time::Duration;
use tauri::State;

async fn send_resend_internal(
    http: &reqwest::Client,
    api_key: &str,
    from_email: &str,
    to_email: &str,
    subject: &str,
    html: &str,
) -> Result<String, String> {
    let key = api_key.trim();
    if key.is_empty() {
        return Err("La API Key de Resend es obligatoria.".to_string());
    }
    let from = if from_email.trim().is_empty() {
        "Laryko <onboarding@resend.dev>"
    } else {
        from_email.trim()
    };
    let to = to_email.trim();
    if !to.contains('@') {
        return Err("Ingresa un correo destinatario válido.".to_string());
    }

    let payload = serde_json::json!({
        "from": from,
        "to": [to],
        "subject": subject,
        "html": html
    });

    let res = http
        .post("https://api.resend.com/emails")
        .timeout(Duration::from_secs(15))
        .bearer_auth(key)
        .header("Content-Type", "application/json")
        .body(payload.to_string())
        .send()
        .await
        .map_err(|e| format!("Error conectando con Resend: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("Resend respondió HTTP {}: {}", status, text));
    }

    Ok("Correo enviado correctamente con Resend.".to_string())
}

#[tauri::command]
pub async fn send_resend_email(
    state: State<'_, AppState>,
    api_key: String,
    from_email: String,
    to_email: String,
    subject: String,
    html: String,
) -> Result<String, String> {
    send_resend_internal(&state.http, &api_key, &from_email, &to_email, &subject, &html).await
}

#[tauri::command]
pub async fn test_resend_connection(
    state: State<'_, AppState>,
    api_key: String,
    from_email: String,
    to_email: String,
) -> Result<String, String> {
    send_resend_internal(
        &state.http,
        &api_key,
        &from_email,
        &to_email,
        "Laryko — Prueba de conexión Resend",
        "<p>Tu integración de <strong>Resend</strong> en Laryko está funcionando correctamente.</p>",
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
