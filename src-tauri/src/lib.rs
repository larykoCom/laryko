mod commands;
mod state;

use state::AppState;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            commands::sessions::spawn_idle_reaper(app.handle().clone());

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
            commands::updater::download_and_install_update,
            commands::sessions::open_external_url,
            commands::sessions::set_idle_sleep_minutes,
            commands::sessions::open_session_webview,
            commands::sessions::control_session_webview,
            commands::sessions::set_session_bounds,
            commands::sessions::hide_all_session_webviews,
            commands::sessions::sleep_session_webview,
            commands::sessions::sleep_all_sessions,
            commands::sessions::get_active_session_uuids,
            commands::sessions::delete_session_data,
            commands::neon::test_neon_connection,
            commands::neon::sync_vault_to_neon,
            commands::neon::pull_vault_from_neon,
            commands::neon::register_neon_account,
            commands::neon::fetch_neon_account,
            commands::neon::delete_neon_account,
            commands::integrations::send_resend_email,
            commands::integrations::test_resend_connection,
            commands::integrations::test_r2_endpoint,
            commands::ai::test_ai_provider,
            commands::ai::list_ai_models,
            commands::ai::ai_chat_completion,
            commands::notifications::send_native_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
