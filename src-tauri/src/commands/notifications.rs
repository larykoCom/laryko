fn ensure_notification_icon_path() -> Option<std::path::PathBuf> {
    let path = std::env::temp_dir().join("laryko-notif-icon.png");
    if !path.exists() {
        let icon_bytes = include_bytes!("../../icons/128x128.png");
        let _ = std::fs::write(&path, icon_bytes);
    }
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

#[tauri::command]
pub fn send_native_notification(title: String, body: String) -> Result<(), String> {
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
