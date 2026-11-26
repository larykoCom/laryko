use futures_util::StreamExt;
use serde::Serialize;
use std::fs::File;
use std::io::Write;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::{DownloadEvent, NewWindowResponse},
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl,
    WindowEvent,
};

#[derive(Clone, Serialize)]
struct DownloadProgress {
    downloaded: u64,
    total: u64,
    percentage: f64,
}

#[tauri::command]
async fn download_and_install_update(
    app: AppHandle,
    url: String,
    filename: String,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("Laryko-Desktop-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Error conectando con el servidor de descarga: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("El servidor devolvió el código HTTP: {}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let temp_dir = std::env::temp_dir();
    let target_path = temp_dir.join(&filename);

    let mut file = File::create(&target_path)
        .map_err(|e| format!("No se pudo crear el archivo temporal: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error durante la descarga: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Error guardando el archivo: {}", e))?;
        downloaded += chunk.len() as u64;

        let percentage = if total > 0 {
            (downloaded as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        let _ = app.emit("update-download-progress", DownloadProgress {
            downloaded,
            total,
            percentage,
        });
    }

    file.flush().map_err(|e| e.to_string())?;
    drop(file);

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&target_path)
            .spawn()
            .map_err(|e| format!("Error abriendo el archivo DMG: {}", e))?;

        std::thread::sleep(std::time::Duration::from_millis(1500));
        app.exit(0);
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new(&target_path)
            .spawn()
            .map_err(|e| format!("Error ejecutando el instalador de Windows: {}", e))?;

        std::thread::sleep(std::time::Duration::from_millis(1000));
        app.exit(0);
    }

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&target_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&target_path, perms);
        }

        std::process::Command::new(&target_path)
            .spawn()
            .map_err(|e| format!("Error ejecutando AppImage: {}", e))?;

        std::thread::sleep(std::time::Duration::from_millis(1000));
        app.exit(0);
    }

    #[allow(unreachable_code)]
    Ok(())
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let parsed = tauri::Url::parse(url.trim()).map_err(|_| "URL externa inválida.".to_string())?;
    if !matches!(parsed.scheme(), "https" | "http") {
        return Err("Solo se permiten enlaces http:// o https://.".to_string());
    }
    let clean_url = parsed.to_string();

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&clean_url)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/c", "start", "", &clean_url])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&clean_url)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn validate_session_uuid(uuid: &str) -> Result<(), String> {
    if uuid.len() < 8
        || uuid.len() > 64
        || !uuid.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("Identificador de sesión inválido.".to_string());
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn uuid_to_store_id(uuid: &str) -> [u8; 16] {
    let hex: String = uuid.chars().filter(|c| c.is_ascii_hexdigit()).collect();
    let mut bytes = [0u8; 16];
    for i in 0..16 {
        if let Some(slice) = hex.get(i * 2..i * 2 + 2) {
            if let Ok(val) = u8::from_str_radix(slice, 16) {
                bytes[i] = val;
            }
        }
    }
    bytes
}

fn resolve_viewport_bounds(
    window: &tauri::Window,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> (LogicalPosition<f64>, LogicalSize<f64>) {
    let clamped_x = x.max(0.0);
    let clamped_y = y.max(0.0);
    let mut final_w = width.max(200.0);
    let mut final_h = height.max(200.0);

    if let Ok(inner) = window.inner_size() {
        let scale = window.scale_factor().unwrap_or(1.0);
        let logical_w = (inner.width as f64) / scale;
        let logical_h = (inner.height as f64) / scale;
        if clamped_y <= 2.0 {
            final_h = (logical_h - clamped_y).max(200.0);
        }
        if clamped_x + final_w >= logical_w - 4.0 {
            final_w = (logical_w - clamped_x).max(200.0);
        }
    }

    (
        LogicalPosition::new(clamped_x, clamped_y),
        LogicalSize::new(final_w, final_h),
    )
}

#[tauri::command]
async fn open_session_webview(
    app: AppHandle,
    session_uuid: String,
    _title: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    validate_session_uuid(&session_uuid)?;

    let parsed_url = tauri::Url::parse(&url).map_err(|e| format!("URL inválida: {}", e))?;
    match parsed_url.scheme() {
        "https" | "http" => {}
        other => return Err(format!("Esquema de URL no permitido: {}", other)),
    }

    let label = format!("session-{}", session_uuid);

    // Ocultar otros contenedores activos para mostrar solo el seleccionado dentro del viewport
    for (existing_label, wv) in app.webviews() {
        if existing_label.starts_with("session-") && existing_label != label {
            let _ = wv.hide();
        }
    }

    let main_window = app
        .get_window("main")
        .ok_or_else(|| "No se encontró la ventana principal.".to_string())?;

    let (pos, size) = resolve_viewport_bounds(&main_window, x, y, width, height);

    if let Some(existing) = app.get_webview(&label) {
        let _ = existing.set_bounds(tauri::Rect {
            position: pos.into(),
            size: size.into(),
        });
        let _ = existing.show();
        let _ = existing.set_focus();
        return Ok(());
    }

    #[allow(unused_mut)]
    let mut builder = WebviewBuilder::new(&label, WebviewUrl::External(parsed_url))
        .disable_drag_drop_handler()
        .on_new_window(move |url, _features| {
            if matches!(url.scheme(), "https" | "http") {
                let _ = open_external_url(url.to_string());
            }
            NewWindowResponse::Deny
        })
        .on_download({
            let app_for_dl = app.clone();
            move |_webview, event| {
                match event {
                    DownloadEvent::Requested { url: _, destination } => {
                        if let Ok(dl_dir) = app_for_dl.path().download_dir() {
                            let _ = std::fs::create_dir_all(&dl_dir);
                            let file_name = destination
                                .file_name()
                                .map(|n| n.to_os_string())
                                .unwrap_or_else(|| std::ffi::OsString::from("descarga-laryko"));
                            let mut target = dl_dir.join(&file_name);
                            if target.exists() {
                                let stem = target
                                    .file_stem()
                                    .and_then(|s| s.to_str())
                                    .unwrap_or("descarga")
                                    .to_string();
                                let ext = target
                                    .extension()
                                    .and_then(|s| s.to_str())
                                    .map(|e| format!(".{}", e))
                                    .unwrap_or_default();
                                for idx in 1..1000 {
                                    let candidate = dl_dir.join(format!("{} ({}){}", stem, idx, ext));
                                    if !candidate.exists() {
                                        target = candidate;
                                        break;
                                    }
                                }
                            }
                            *destination = target;
                        }
                        true
                    }
                    DownloadEvent::Finished {
                        url: _,
                        path,
                        success,
                    } => {
                        if success {
                            if let Some(p) = path {
                                let name = p
                                    .file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("Archivo")
                                    .to_string();
                                let _ = app_for_dl.emit("laryko://download-finished", name);
                            }
                        }
                        true
                    }
                    _ => true,
                }
            }
        });

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .data_store_identifier(uuid_to_store_id(&session_uuid))
            .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36");
    }

    #[cfg(not(target_os = "macos"))]
    {
        let base_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("No se pudo resolver app_data_dir: {}", e))?;
        let session_dir = base_dir.join("sessions").join(&session_uuid);
        std::fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Error creando directorio de sesión: {}", e))?;
        builder = builder.data_directory(session_dir);
    }

    main_window
        .add_child(builder, pos, size)
        .map_err(|e| format!("Error al incrustar el contenedor WebView: {}", e))?;

    Ok(())
}

#[tauri::command]
fn set_session_bounds(
    app: AppHandle,
    session_uuid: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    validate_session_uuid(&session_uuid)?;
    let label = format!("session-{}", session_uuid);
    if let (Some(wv), Some(win)) = (app.get_webview(&label), app.get_window("main")) {
        let (pos, size) = resolve_viewport_bounds(&win, x, y, width, height);
        let _ = wv.set_bounds(tauri::Rect {
            position: pos.into(),
            size: size.into(),
        });
    }
    Ok(())
}

#[tauri::command]
fn hide_all_session_webviews(app: AppHandle) -> Result<(), String> {
    for (label, wv) in app.webviews() {
        if label.starts_with("session-") {
            let _ = wv.hide();
        }
    }
    if let Some(main_wv) = app.get_webview("main") {
        let _ = main_wv.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn sleep_session_webview(app: AppHandle, session_uuid: String) -> Result<(), String> {
    validate_session_uuid(&session_uuid)?;
    let label = format!("session-{}", session_uuid);
    if let Some(wv) = app.get_webview(&label) {
        wv.close().map_err(|e| e.to_string())?;
    }
    if let Some(main_wv) = app.get_webview("main") {
        let _ = main_wv.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn sleep_all_sessions(app: AppHandle) -> Result<(), String> {
    for (label, wv) in app.webviews() {
        if label.starts_with("session-") {
            let _ = wv.close();
        }
    }
    if let Some(main_wv) = app.get_webview("main") {
        let _ = main_wv.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn get_active_session_uuids(app: AppHandle) -> Vec<String> {
    app.webviews()
        .keys()
        .filter_map(|label| label.strip_prefix("session-").map(|s| s.to_string()))
        .collect()
}

#[tauri::command]
fn delete_session_data(app: AppHandle, session_uuid: String) -> Result<(), String> {
    validate_session_uuid(&session_uuid)?;
    let label = format!("session-{}", session_uuid);
    if let Some(wv) = app.get_webview(&label) {
        let _ = wv.close();
    }

    if let Ok(base_dir) = app.path().app_data_dir() {
        let session_dir = base_dir.join("sessions").join(&session_uuid);
        if session_dir.exists() {
            let _ = std::fs::remove_dir_all(&session_dir);
        }
    }
    Ok(())
}

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
    database_url: &str,
    query: &str,
    params: Vec<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let host = parse_neon_host(database_url)?;
    let endpoint = format!("https://{}/sql", host);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({
        "query": query,
        "params": params
    });

    let res = client
        .post(&endpoint)
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
async fn test_neon_connection(database_url: String) -> Result<String, String> {
    execute_neon_sql(&database_url, "SELECT 1 AS ok;", vec![]).await?;
    Ok("Conexión exitosa con Neon Postgres.".to_string())
}

#[tauri::command]
async fn sync_vault_to_neon(
    database_url: String,
    encrypted_payload: String,
) -> Result<String, String> {
    execute_neon_sql(
        &database_url,
        "CREATE TABLE IF NOT EXISTS laryko_vault (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());",
        vec![],
    )
    .await?;

    execute_neon_sql(
        &database_url,
        "INSERT INTO laryko_vault (id, payload, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();",
        vec![serde_json::Value::String(encrypted_payload)],
    )
    .await?;

    Ok("Bóveda cifrada sincronizada en Neon Postgres.".to_string())
}

#[tauri::command]
async fn pull_vault_from_neon(database_url: String) -> Result<Option<String>, String> {
    let json = execute_neon_sql(
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
struct NeonAccountRecord {
    username: String,
    email: String,
    password_salt: String,
    password_hash: String,
    encrypted_vault: String,
}

#[tauri::command]
async fn register_neon_account(
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
        &database_url,
        "CREATE TABLE IF NOT EXISTS laryko_accounts (id SERIAL PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, encrypted_vault TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());",
        vec![],
    )
    .await?;

    execute_neon_sql(
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
async fn fetch_neon_account(
    database_url: String,
    identifier: String,
) -> Result<Option<NeonAccountRecord>, String> {
    let clean = identifier.trim().to_string();
    if clean.is_empty() {
        return Err("Ingresa tu usuario o correo electrónico.".to_string());
    }

    let json = execute_neon_sql(
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
async fn delete_neon_account(database_url: String, email: Option<String>) -> Result<String, String> {
    if let Some(clean_email) = email.map(|e| e.trim().to_lowercase()).filter(|e| !e.is_empty()) {
        let _ = execute_neon_sql(
            &database_url,
            "DELETE FROM laryko_accounts WHERE LOWER(email) = LOWER($1);",
            vec![serde_json::Value::String(clean_email)],
        )
        .await;
    }
    let _ = execute_neon_sql(
        &database_url,
        "DELETE FROM laryko_vault WHERE id = 1;",
        vec![],
    )
    .await;
    Ok("Cuenta y bóveda eliminadas de la base de datos.".to_string())
}

#[tauri::command]
async fn send_resend_email(
    api_key: String,
    from_email: String,
    to_email: String,
    subject: String,
    html: String,
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

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let payload = serde_json::json!({
        "from": from,
        "to": [to],
        "subject": subject,
        "html": html
    });

    let res = client
        .post("https://api.resend.com/emails")
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
async fn test_resend_connection(
    api_key: String,
    from_email: String,
    to_email: String,
) -> Result<String, String> {
    send_resend_email(
        api_key,
        from_email,
        to_email,
        "Laryko — Prueba de conexión Resend".to_string(),
        "<p>Tu integración de <strong>Resend</strong> en Laryko está funcionando correctamente.</p>".to_string(),
    )
    .await
}

#[tauri::command]
async fn test_r2_endpoint(account_id: String, bucket_name: String) -> Result<String, String> {
    let acc = account_id.trim();
    let bucket = bucket_name.trim();
    if acc.is_empty()
        || !acc.chars().all(|c| c.is_ascii_alphanumeric())
    {
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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .head(&url)
        .send()
        .await
        .map_err(|e| format!("No se pudo alcanzar el endpoint R2: {}", e))?;

    // R2 devuelve 200, 400 o 403 cuando el endpoint del bucket existe y responde TLS
    let code = res.status().as_u16();
    if code == 200 || code == 400 || code == 403 {
        return Ok(format!("Endpoint R2 alcanzable (HTTP {}).", code));
    }
    Err(format!("Endpoint R2 devolvió HTTP {}.", code))
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

#[tauri::command]
async fn test_ai_provider(
    provider: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<String, String> {
    let key = api_key.trim();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let req = build_models_request(&client, provider.as_str(), key, base_url)?;

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
async fn list_ai_models(
    provider: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<Vec<String>, String> {
    let key = api_key.trim();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let req = build_models_request(&client, provider.as_str(), key, base_url)?;
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
    } else {
        if let Some(arr) = json.get("data").and_then(|v| v.as_array()) {
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
    }

    models.sort();
    models.dedup();
    Ok(models)
}

#[derive(serde::Deserialize)]
struct AiChatMessageInput {
    role: String,
    content: String,
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
async fn ai_chat_completion(
    provider: String,
    api_key: String,
    messages: Vec<AiChatMessageInput>,
    base_url: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let key = api_key.trim();
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

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

            let mut req = client
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

            let res = client
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
            let res = client
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

fn ensure_notification_icon_path() -> Option<std::path::PathBuf> {
    let path = std::env::temp_dir().join("laryko-notif-icon.png");
    if !path.exists() {
        let icon_bytes = include_bytes!("../icons/128x128.png");
        let _ = std::fs::write(&path, icon_bytes);
    }
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

#[tauri::command]
fn send_native_notification(title: String, body: String) -> Result<(), String> {
    let clean_title = title.replace(['"', '\\', '\n', '\r'], " ");
    let clean_body = body.replace(['"', '\\', '\n', '\r'], " ");
    let icon_path = ensure_notification_icon_path();

    #[cfg(target_os = "macos")]
    {
        let _ = &icon_path;
        let script = format!(
            "display notification \"{}\" with title \"{}\"",
            clean_body, clean_title
        );
        std::process::Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .map_err(|e| format!("Error enviando notificación macOS: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let mut cmd = std::process::Command::new("notify-send");
        if let Some(ref p) = icon_path {
            cmd.args(["-i", &p.to_string_lossy()]);
        }
        cmd.args([&clean_title, &clean_body])
            .spawn()
            .map_err(|e| format!("Error enviando notificación Linux: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        let img_xml = icon_path
            .as_ref()
            .map(|p| {
                format!(
                    "$img = $t.GetElementsByTagName('image').Item(0); if ($img) {{ $img.SetAttribute('src', 'file:///{}'); }}",
                    p.to_string_lossy().replace('\\', "/").replace('\'', "''")
                )
            })
            .unwrap_or_default();
        let template = if icon_path.is_some() {
            "ToastImageAndText02"
        } else {
            "ToastText02"
        };
        let ps = format!(
            "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null; $t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::{}); $n = $t.GetElementsByTagName('text'); $n.Item(0).AppendChild($t.CreateTextNode('{}')) > $null; $n.Item(1).AppendChild($t.CreateTextNode('{}')) > $null; {} [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Laryko').Show([Windows.UI.Notifications.ToastNotification]::new($t))",
            template,
            clean_title.replace('\'', "''"),
            clean_body.replace('\'', "''"),
            img_xml
        );
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps])
            .spawn()
            .map_err(|e| format!("Error enviando notificación Windows: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let app_submenu = Submenu::with_items(
                    app,
                    "Laryko",
                    true,
                    &[
                        &PredefinedMenuItem::about(app, Some("Acerca de Laryko"), None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::hide(app, Some("Ocultar Laryko"))?,
                        &PredefinedMenuItem::hide_others(app, Some("Ocultar otros"))?,
                        &PredefinedMenuItem::show_all(app, Some("Mostrar todo"))?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::quit(app, Some("Salir de Laryko"))?,
                    ],
                )?;
                let edit_submenu = Submenu::with_items(
                    app,
                    "Edición",
                    true,
                    &[
                        &PredefinedMenuItem::undo(app, Some("Deshacer"))?,
                        &PredefinedMenuItem::redo(app, Some("Rehacer"))?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::cut(app, Some("Cortar"))?,
                        &PredefinedMenuItem::copy(app, Some("Copiar"))?,
                        &PredefinedMenuItem::paste(app, Some("Pegar"))?,
                        &PredefinedMenuItem::select_all(app, Some("Seleccionar todo"))?,
                    ],
                )?;
                let app_menu = Menu::with_items(app, &[&app_submenu, &edit_submenu])?;
                app.set_menu(app_menu)?;
            }

            let show_item = MenuItem::with_id(app, "show", "Abrir Laryko", true, None::<&str>)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Salir completamente", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Laryko")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                    for (label, wv) in window.app_handle().webviews() {
                        if label.starts_with("session-") {
                            let _ = wv.hide();
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            download_and_install_update,
            open_external_url,
            open_session_webview,
            set_session_bounds,
            hide_all_session_webviews,
            sleep_session_webview,
            sleep_all_sessions,
            get_active_session_uuids,
            delete_session_data,
            test_neon_connection,
            sync_vault_to_neon,
            pull_vault_from_neon,
            register_neon_account,
            fetch_neon_account,
            delete_neon_account,
            send_resend_email,
            test_resend_connection,
            test_r2_endpoint,
            test_ai_provider,
            list_ai_models,
            ai_chat_completion,
            send_native_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
