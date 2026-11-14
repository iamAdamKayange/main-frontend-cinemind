//! Narrow, typed native bridge (spec §4.3). Only the editor UI invokes these commands;
//! the AI never reaches them directly, and nothing here executes shell strings.

#[derive(serde::Serialize)]
struct PlatformInfo {
    os: &'static str,
    arch: &'static str,
    local_render_available: bool,
}

#[tauri::command]
fn platform_info() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        // Phase 9: detect a bundled/located FFmpeg for local rendering.
        local_render_available: false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        // Keep one desktop window when the OS launches a second process for an OAuth deep link.
        .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![platform_info]);
    builder
        .run(tauri::generate_context!())
        .expect("error while running CineMind AI desktop");
}
