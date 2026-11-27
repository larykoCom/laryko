use crate::state::AppState;
use futures_util::StreamExt;
use serde::Serialize;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Serialize)]
struct DownloadProgress {
    downloaded: u64,
    total: u64,
    percentage: f64,
}

#[tauri::command]
pub async fn download_and_install_update(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    filename: String,
) -> Result<(), String> {
    let parsed = tauri::Url::parse(url.trim()).map_err(|_| "URL de descarga inválida.".to_string())?;
    if !matches!(parsed.scheme(), "https" | "http") {
        return Err("Solo se permiten descargas http:// o https://.".to_string());
    }

    let safe_filename = Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty())
        .ok_or_else(|| "Nombre de archivo inválido.".to_string())?;

    let response = state
        .http
        .get(parsed)
        .header("User-Agent", "Laryko-Desktop-Updater")
        .send()
        .await
        .map_err(|e| format!("Error conectando con el servidor de descarga: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("El servidor devolvió el código HTTP: {}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let target_path = std::env::temp_dir().join(safe_filename);

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

        let _ = app.emit(
            "update-download-progress",
            DownloadProgress {
                downloaded,
                total,
                percentage,
            },
        );
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
