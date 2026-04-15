mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::recognize_song,
            commands::fetch_lyrics_lrclib,
            commands::fetch_lyrics_genius,
            commands::translate_text,
            commands::run_demucs,
            commands::run_whisper,
            commands::detect_language,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
