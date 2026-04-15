#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

// WebKitGTK's DMABUF renderer causes jank on AMD GPUs under Wayland.
// Disabling it forces the non-DMABUF compositing path which is smooth.
#[cfg(target_os = "linux")]
fn configure_webkitgtk() {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
}
use tauri::{
    Manager, State,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_shell::ShellExt;

struct ServerPort(Mutex<Option<u16>>);

#[tauri::command]
fn get_server_port(state: State<'_, ServerPort>) -> Result<u16, String> {
    state.0.lock().unwrap().ok_or_else(|| "Server not ready".into())
}

#[tauri::command]
async fn copy_file_to_clipboard(path: String) -> Result<(), String> {
    let pb = std::path::PathBuf::from(&path);
    if !pb.is_file() {
        return Err(format!("Not a file: {path}"));
    }

    #[cfg(target_os = "macos")]
    {
        let escaped = path.replace('\\', "\\\\").replace('"', "\\\"");
        let script = format!(r#"set the clipboard to (POSIX file "{escaped}")"#);
        let status = std::process::Command::new("osascript")
            .args(["-e", &script])
            .status()
            .map_err(|e| format!("osascript failed: {e}"))?;
        if !status.success() {
            return Err(format!("osascript exited with status {status}"));
        }
    }

    #[cfg(target_os = "windows")]
    {
        let escaped = path.replace('\'', "''");
        let script = format!("Set-Clipboard -Path '{escaped}'");
        let status = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .status()
            .map_err(|e| format!("powershell failed: {e}"))?;
        if !status.success() {
            return Err(format!("powershell exited with status {status}"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        let uri = format!("file://{path}\n");
        let mut child = std::process::Command::new("xclip")
            .args(["-selection", "clipboard", "-t", "text/uri-list", "-i"])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("xclip not available: {e}"))?;
        child
            .stdin
            .as_mut()
            .ok_or_else(|| "failed to open xclip stdin".to_string())?
            .write_all(uri.as_bytes())
            .map_err(|e| format!("xclip write failed: {e}"))?;
        let status = child.wait().map_err(|e| format!("xclip wait failed: {e}"))?;
        if !status.success() {
            return Err(format!("xclip exited with status {status}"));
        }
    }

    Ok(())
}

fn current_exe_directory() -> Option<std::path::PathBuf> {
    // Linux AppImage: APPIMAGE env var holds the path to the .AppImage file.
    // current_exe() during AppImage execution returns the temporary AppRun path
    // inside the mounted squashfs, which is not what we want.
    if let Ok(appimage) = std::env::var("APPIMAGE") {
        return std::path::PathBuf::from(appimage).parent().map(std::path::PathBuf::from);
    }

    // macOS: current_exe() is inside .app/Contents/MacOS/. Walk up three
    // levels to get the directory containing the .app bundle itself.
    #[cfg(target_os = "macos")]
    {
        let exe = std::env::current_exe().ok()?;
        return exe
            .parent()? // MacOS
            .parent()? // Contents
            .parent()? // Alacrity.app
            .parent() // containing directory
            .map(std::path::PathBuf::from);
    }

    // Linux (non-AppImage) and Windows
    #[allow(unreachable_code)]
    std::env::current_exe().ok()?.parent().map(std::path::PathBuf::from)
}

fn detect_portable_data_dir() -> Option<std::path::PathBuf> {
    let exe_dir = current_exe_directory()?;
    let sentinel = exe_dir.join("portable.txt");
    if sentinel.is_file() {
        let data = exe_dir.join("data");
        std::fs::create_dir_all(&data).ok();
        Some(data)
    } else {
        None
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    configure_webkitgtk();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ServerPort(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![get_server_port, copy_file_to_clipboard])
        .setup(|app| {
            let handle = app.handle().clone();

            // Resolve data and resources directories
            // In dev mode, use the project root (cwd) for both.
            // In release mode, use platform-standard app data dir and bundle resources.
            let (data_dir, resource_dir) = if cfg!(dev) {
                // Tauri dev runs from src-tauri/, so go up one level to project root
                let cwd = std::env::current_dir().expect("no cwd");
                let project_root = cwd.parent().unwrap_or(&cwd).to_path_buf();
                (project_root.clone(), project_root)
            } else {
                let res = app.path().resource_dir().expect("no resource dir");
                let data = match detect_portable_data_dir() {
                    Some(portable) => {
                        eprintln!("[alacrity] Portable mode: using {}", portable.display());
                        portable
                    }
                    None => app.path().app_data_dir().expect("no app data dir"),
                };
                (data, res)
            };
            std::fs::create_dir_all(&data_dir).ok();

            // Copy pre-seeded DB on first launch
            let db_dir = data_dir.join("data");
            std::fs::create_dir_all(&db_dir).ok();
            let db_target = db_dir.join("pokemon.db");
            if !db_target.exists() {
                let db_source = resource_dir.join("data").join("pokemon.db");
                if db_source.exists() {
                    std::fs::copy(&db_source, &db_target).ok();
                }
            }

            // Launch sidecar
            // In dev mode, use fixed port 3001 so Vite's proxy works.
            // In release mode, use auto port — the frontend gets it via IPC.
            let port = if cfg!(dev) { "3001" } else { "auto" };
            let sidecar = app.shell()
                .sidecar("alacrity-server")
                .expect("failed to find sidecar binary")
                .args([
                    "--port", port,
                    "--data-dir", &data_dir.to_string_lossy(),
                    "--resources-dir", &resource_dir.to_string_lossy(),
                    "--log-format", "json",
                ]);

            let (mut rx, _child) = sidecar.spawn().expect("failed to spawn sidecar");

            // Read stdout for events
            let handle_clone = handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let line = String::from_utf8_lossy(&line);
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line.trim()) {
                                match json.get("event").and_then(|e| e.as_str()) {
                                    Some("ready") => {
                                        if let Some(port) = json.get("port").and_then(|p| p.as_u64()) {
                                            let port = port as u16;
                                            *handle_clone.state::<ServerPort>().0.lock().unwrap() = Some(port);
                                            if let Some(w) = handle_clone.get_webview_window("main") {
                                                w.show().ok();
                                            }
                                        }
                                    }
                                    Some("shiny") => {
                                        let species = json.get("species")
                                            .and_then(|s| s.as_str())
                                            .unwrap_or("Unknown");
                                        let hunt_id = json.get("hunt_id")
                                            .and_then(|h| h.as_u64())
                                            .unwrap_or(0);

                                        use tauri_plugin_notification::NotificationExt;
                                        handle_clone.notification()
                                            .builder()
                                            .title("✨ Shiny Found!")
                                            .body(format!("A shiny {} appeared in hunt #{}", species, hunt_id))
                                            .show()
                                            .ok();
                                    }
                                    Some("status") => {
                                        let hunts = json.get("active_hunts").and_then(|h| h.as_u64()).unwrap_or(0);
                                        let encounters = json.get("total_attempts").and_then(|e| e.as_u64()).unwrap_or(0);
                                        let tooltip = if hunts > 0 {
                                            format!("Alacrity - {} hunt{} ({} encounters)",
                                                hunts, if hunts == 1 { "" } else { "s" }, encounters)
                                        } else {
                                            "Alacrity".to_string()
                                        };
                                        if let Some(tray) = handle_clone.tray_by_id("main") {
                                            tray.set_tooltip(Some(&tooltip)).ok();
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[server] {}", String::from_utf8_lossy(&line));
                        }
                        _ => {}
                    }
                }
            });

            // System tray
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Alacrity", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::with_id("main")
                .tooltip("Alacrity")
                .menu(&tray_menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                w.show().ok();
                                w.set_focus().ok();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(move |tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            w.show().ok();
                            w.set_focus().ok();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().ok();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
