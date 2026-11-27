use crate::state::AppState;
use serde::Serialize;
use std::sync::atomic::Ordering;
use std::time::Duration;
use tauri::{
    webview::{DownloadEvent, NewWindowResponse},
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, State, WebviewBuilder, WebviewUrl,
};

#[derive(Clone, Serialize)]
struct SessionUrlPayload {
    uuid: String,
    url: String,
}

#[derive(Clone, Serialize)]
struct SessionUnreadPayload {
    uuid: String,
    count: u32,
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
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

#[cfg(target_os = "macos")]
fn is_google_domain(host: &str) -> bool {
    let h = host.to_ascii_lowercase();
    let google_roots = [
        "google.com",
        "gmail.com",
        "youtube.com",
        "youtu.be",
        "googleapis.com",
        "googleusercontent.com",
        "withgoogle.com",
    ];
    google_roots
        .iter()
        .any(|root| h == *root || h.ends_with(&format!(".{}", root)))
}

#[cfg(target_os = "macos")]
fn resolve_macos_user_agent(url: &tauri::Url) -> &'static str {
    let is_google = url.host_str().map(is_google_domain).unwrap_or(false);
    if is_google {
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15"
    } else {
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    }
}

fn extract_unread_count_from_title(title: &str) -> u32 {
    let trimmed = title.trim();
    if let Some(start) = trimmed.find('(') {
        if let Some(end_rel) = trimmed[start + 1..].find(')') {
            let inner = trimmed[start + 1..start + 1 + end_rel].trim();
            if let Ok(num) = inner.trim_end_matches('+').parse::<u32>() {
                return num;
            }
        }
    }
    if trimmed.starts_with("• ") || trimmed.starts_with("* ") {
        return 1;
    }
    0
}

#[tauri::command]
pub fn set_idle_sleep_minutes(state: State<'_, AppState>, minutes: u64) -> Result<(), String> {
    state.set_idle_sleep_minutes(minutes);
    Ok(())
}

#[tauri::command]
pub fn control_session_webview(
    app: AppHandle,
    state: State<'_, AppState>,
    session_uuid: String,
    action: String,
    url: Option<String>,
) -> Result<String, String> {
    validate_session_uuid(&session_uuid)?;
    let label = format!("session-{}", session_uuid);
    let wv = app
        .get_webview(&label)
        .ok_or_else(|| "La sesión no está activa.".to_string())?;

    state.touch_session(&session_uuid);

    match action.as_str() {
        "back" => {
            wv.eval("window.history.back()")
                .map_err(|e| format!("No se pudo retroceder: {}", e))?;
        }
        "forward" => {
            wv.eval("window.history.forward()")
                .map_err(|e| format!("No se pudo avanzar: {}", e))?;
        }
        "reload" => {
            wv.reload()
                .map_err(|e| format!("No se pudo recargar: {}", e))?;
        }
        "navigate" => {
            let raw = url.unwrap_or_default();
            let parsed = tauri::Url::parse(raw.trim())
                .map_err(|_| "URL inválida para navegar.".to_string())?;
            if !matches!(parsed.scheme(), "https" | "http") {
                return Err("Solo se permiten enlaces http:// o https://.".to_string());
            }
            wv.navigate(parsed)
                .map_err(|e| format!("No se pudo navegar: {}", e))?;
        }
        "get_url" => {}
        _ => return Err("Acción de navegador no reconocida.".to_string()),
    }

    Ok(wv.url().map(|u| u.to_string()).unwrap_or_default())
}

#[tauri::command]
pub async fn open_session_webview(
    app: AppHandle,
    state: State<'_, AppState>,
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
    state.touch_session(&session_uuid);

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

    #[cfg(target_os = "macos")]
    let macos_ua = resolve_macos_user_agent(&parsed_url);

    #[allow(unused_mut)]
    let mut builder = WebviewBuilder::new(&label, WebviewUrl::External(parsed_url))
        .disable_drag_drop_handler()
        .on_page_load({
            let app_for_url = app.clone();
            let uuid_for_url = session_uuid.clone();
            move |wv, payload| {
                if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                    let _ = app_for_url.emit(
                        "laryko://session-url",
                        SessionUrlPayload {
                            uuid: uuid_for_url.clone(),
                            url: wv
                                .url()
                                .map(|u| u.to_string())
                                .unwrap_or_else(|_| payload.url().to_string()),
                        },
                    );
                }
            }
        })
        .on_document_title_changed({
            let app_for_title = app.clone();
            let uuid_for_title = session_uuid.clone();
            move |_wv, title| {
                let count = extract_unread_count_from_title(&title);
                let _ = app_for_title.emit(
                    "laryko://session-unread",
                    SessionUnreadPayload {
                        uuid: uuid_for_title.clone(),
                        count,
                    },
                );
            }
        })
        .on_new_window(move |url, _features| {
            if matches!(url.scheme(), "https" | "http") {
                let _ = open_external_url(url.to_string());
            }
            NewWindowResponse::Deny
        })
        .on_download({
            let app_for_dl = app.clone();
            move |_webview, event| match event {
                DownloadEvent::Requested {
                    url: _,
                    destination,
                } => {
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
        });

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .data_store_identifier(uuid_to_store_id(&session_uuid))
            .user_agent(macos_ua);
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
pub fn set_session_bounds(
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
pub fn hide_all_session_webviews(app: AppHandle) -> Result<(), String> {
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
pub fn sleep_session_webview(
    app: AppHandle,
    state: State<'_, AppState>,
    session_uuid: String,
) -> Result<(), String> {
    validate_session_uuid(&session_uuid)?;
    state.remove_session(&session_uuid);
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
pub fn sleep_all_sessions(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state.clear_sessions();
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
pub fn get_active_session_uuids(app: AppHandle) -> Vec<String> {
    app.webviews()
        .keys()
        .filter_map(|label| label.strip_prefix("session-").map(|s| s.to_string()))
        .collect()
}

#[tauri::command]
pub fn delete_session_data(
    app: AppHandle,
    state: State<'_, AppState>,
    session_uuid: String,
) -> Result<(), String> {
    validate_session_uuid(&session_uuid)?;
    state.remove_session(&session_uuid);
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

pub fn spawn_idle_reaper(app: AppHandle) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(60));
            let state = app.state::<AppState>();
            let max_idle = state.idle_sleep_secs.load(Ordering::Relaxed);
            if max_idle == 0 {
                continue;
            }
            let now = AppState::now_epoch_secs();
            let expired: Vec<String> = match state.sessions.lock() {
                Ok(map) => map
                    .iter()
                    .filter(|(_, &last)| now.saturating_sub(last) >= max_idle)
                    .map(|(uuid, _)| uuid.clone())
                    .collect(),
                Err(_) => Vec::new(),
            };
            for uuid in expired {
                state.remove_session(&uuid);
                let label = format!("session-{}", uuid);
                if let Some(wv) = app.get_webview(&label) {
                    let _ = wv.close();
                }
                let _ = app.emit("laryko://session-slept", uuid);
            }
        }
    });
}
