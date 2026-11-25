use futures_util::StreamExt;
use serde::Serialize;
use std::fs::File;
use std::io::Write;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl,
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
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/c", "start", "", &url])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&url)
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
    let mut builder = WebviewBuilder::new(&label, WebviewUrl::External(parsed_url));

    #[cfg(target_os = "macos")]
    {
        builder = builder.data_store_identifier(uuid_to_store_id(&session_uuid));
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
    Ok(())
}

#[tauri::command]
fn sleep_session_webview(app: AppHandle, session_uuid: String) -> Result<(), String> {
    validate_session_uuid(&session_uuid)?;
    let label = format!("session-{}", session_uuid);
    if let Some(wv) = app.get_webview(&label) {
        wv.close().map_err(|e| e.to_string())?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            download_and_install_update,
            open_external_url,
            open_session_webview,
            set_session_bounds,
            hide_all_session_webviews,
            sleep_session_webview,
            sleep_all_sessions,
            get_active_session_uuids,
            delete_session_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
