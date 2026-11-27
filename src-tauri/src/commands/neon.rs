use crate::state::AppState;
use std::time::Duration;
use tauri::State;

fn parse_neon_host(database_url: &str) -> Result<String, String> {
    let trimmed = database_url.trim();
    let parsed = tauri::Url::parse(trimmed)
        .map_err(|_| "Cadena de conexión PostgreSQL inválida.".to_string())?;

    match parsed.scheme() {
        "postgres" | "postgresql" => {}
        _ => return Err("La URL debe comenzar con postgres:// o postgresql://".to_string()),
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| "La URL de Neon no contiene un host válido.".to_string())?;

    if host == "localhost"
        || host == "127.0.0.1"
        || host == "::1"
        || host.starts_with("10.")
        || host.starts_with("192.168.")
    {
        return Err("Host privado o local no permitido.".to_string());
    }

    Ok(host.to_string())
}

async fn execute_neon_sql(
    http: &reqwest::Client,
    database_url: &str,
    query: &str,
    params: Vec<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let host = parse_neon_host(database_url)?;
    let endpoint = format!("https://{}/sql", host);

    let body = serde_json::json!({
        "query": query,
        "params": params
    });

    let res = http
        .post(&endpoint)
        .timeout(Duration::from_secs(15))
        .header("Neon-Connection-String", database_url.trim())
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| format!("Error conectando con Neon: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("Neon respondió HTTP {}: {}", status, text));
    }

    let text = res
        .text()
        .await
        .map_err(|e| format!("Error leyendo respuesta de Neon: {}", e))?;

    serde_json::from_str::<serde_json::Value>(&text)
        .map_err(|e| format!("Respuesta JSON inválida de Neon: {}", e))
}

#[tauri::command]
pub async fn test_neon_connection(
    state: State<'_, AppState>,
    database_url: String,
) -> Result<String, String> {
    execute_neon_sql(&state.http, &database_url, "SELECT 1 AS ok;", vec![]).await?;
    Ok("Conexión exitosa con Neon Postgres.".to_string())
}

#[tauri::command]
pub async fn sync_vault_to_neon(
    state: State<'_, AppState>,
    database_url: String,
    encrypted_payload: String,
) -> Result<String, String> {
    execute_neon_sql(
        &state.http,
        &database_url,
        "CREATE TABLE IF NOT EXISTS laryko_vault (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());",
        vec![],
    )
    .await?;

    execute_neon_sql(
        &state.http,
        &database_url,
        "INSERT INTO laryko_vault (id, payload, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();",
        vec![serde_json::Value::String(encrypted_payload)],
    )
    .await?;

    Ok("Bóveda cifrada sincronizada en Neon Postgres.".to_string())
}

#[tauri::command]
pub async fn pull_vault_from_neon(
    state: State<'_, AppState>,
    database_url: String,
) -> Result<Option<String>, String> {
    let json = execute_neon_sql(
        &state.http,
        &database_url,
        "SELECT payload FROM laryko_vault WHERE id = 1 LIMIT 1;",
        vec![],
    )
    .await?;

    let payload = json
        .get("rows")
        .and_then(|rows| rows.as_array())
        .and_then(|arr| arr.first())
        .and_then(|row| row.get("payload"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(payload)
}

#[derive(serde::Serialize)]
pub struct NeonAccountRecord {
    pub username: String,
    pub email: String,
    pub password_salt: String,
    pub password_hash: String,
    pub encrypted_vault: String,
}

#[tauri::command]
pub async fn register_neon_account(
    state: State<'_, AppState>,
    database_url: String,
    username: String,
    email: String,
    password_salt: String,
    password_hash: String,
    encrypted_vault: String,
) -> Result<String, String> {
    let clean_user = username.trim().to_string();
    let clean_email = email.trim().to_lowercase();
    if clean_user.is_empty() || clean_email.is_empty() {
        return Err("Usuario y correo son obligatorios.".to_string());
    }

    execute_neon_sql(
        &state.http,
        &database_url,
        "CREATE TABLE IF NOT EXISTS laryko_accounts (id SERIAL PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, encrypted_vault TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());",
        vec![],
    )
    .await?;

    execute_neon_sql(
        &state.http,
        &database_url,
        "INSERT INTO laryko_accounts (username, email, password_salt, password_hash, encrypted_vault, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password_salt = EXCLUDED.password_salt, password_hash = EXCLUDED.password_hash, encrypted_vault = EXCLUDED.encrypted_vault, updated_at = NOW();",
        vec![
            serde_json::Value::String(clean_user),
            serde_json::Value::String(clean_email),
            serde_json::Value::String(password_salt),
            serde_json::Value::String(password_hash),
            serde_json::Value::String(encrypted_vault),
        ],
    )
    .await?;

    Ok("Cuenta guardada de forma segura en Neon Postgres.".to_string())
}

#[tauri::command]
pub async fn fetch_neon_account(
    state: State<'_, AppState>,
    database_url: String,
    identifier: String,
) -> Result<Option<NeonAccountRecord>, String> {
    let clean = identifier.trim().to_string();
    if clean.is_empty() {
        return Err("Ingresa tu usuario o correo electrónico.".to_string());
    }

    let json = execute_neon_sql(
        &state.http,
        &database_url,
        "SELECT username, email, password_salt, password_hash, encrypted_vault FROM laryko_accounts WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1;",
        vec![serde_json::Value::String(clean)],
    )
    .await?;

    let row = json
        .get("rows")
        .and_then(|rows| rows.as_array())
        .and_then(|arr| arr.first());

    match row {
        Some(r) => {
            let username = r.get("username").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let email = r.get("email").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let password_salt = r.get("password_salt").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let password_hash = r.get("password_hash").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let encrypted_vault = r.get("encrypted_vault").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            if email.is_empty() || password_hash.is_empty() || encrypted_vault.is_empty() {
                return Ok(None);
            }
            Ok(Some(NeonAccountRecord {
                username,
                email,
                password_salt,
                password_hash,
                encrypted_vault,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn delete_neon_account(
    state: State<'_, AppState>,
    database_url: String,
    email: Option<String>,
) -> Result<String, String> {
    if let Some(clean_email) = email.map(|e| e.trim().to_lowercase()).filter(|e| !e.is_empty()) {
        let _ = execute_neon_sql(
            &state.http,
            &database_url,
            "DELETE FROM laryko_accounts WHERE LOWER(email) = LOWER($1);",
            vec![serde_json::Value::String(clean_email)],
        )
        .await;
    }
    let _ = execute_neon_sql(
        &state.http,
        &database_url,
        "DELETE FROM laryko_vault WHERE id = 1;",
        vec![],
    )
    .await;
    Ok("Cuenta y bóveda eliminadas de la base de datos.".to_string())
}
