use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultFile {
    relative_path: String,
    absolute_path: String,
    content: String,
    modified_ms: Option<u128>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultReadError {
    relative_path: String,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultReadResult {
    root_path: String,
    files: Vec<VaultFile>,
    errors: Vec<VaultReadError>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WriteResult {
    ok: bool,
    path: String,
    modified_ms: Option<u128>,
    message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ThemeManifest {
    name: String,
    relative_path: String,
    absolute_path: String,
    content: String,
    kind: String,
}

fn modified_ms(path: &Path) -> Option<u128> {
    fs::metadata(path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
}

fn normalize_relative_path(relative_path: &str) -> Result<PathBuf, String> {
    if relative_path.trim().is_empty() {
        return Ok(PathBuf::new());
    }
    let path = PathBuf::from(relative_path);
    if path.is_absolute()
        || relative_path.contains("..")
        || relative_path.contains('\\')
    {
        return Err("Path must be a safe relative path inside the vault.".to_string());
    }
    Ok(path)
}

fn sanitize_segment(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty()
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed.contains("..")
        || trimmed.starts_with('.')
    {
        return Err("Name must be a non-empty path segment without slashes, dots, or traversal.".to_string());
    }
    Ok(trimmed.to_string())
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;

    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
            last_was_dash = false;
        } else if !last_was_dash {
            slug.push('-');
            last_was_dash = true;
        }
    }

    slug.trim_matches('-').to_string()
}

fn ensure_inside(root: &Path, path: &Path) -> Result<(), String> {
    let root = root
        .canonicalize()
        .map_err(|error| format!("Could not resolve vault path: {error}"))?;
    let candidate = if path.exists() {
        path.canonicalize()
            .map_err(|error| format!("Could not resolve path: {error}"))?
    } else {
        path.parent()
            .unwrap_or(path)
            .canonicalize()
            .map_err(|error| format!("Could not resolve parent path: {error}"))?
    };

    if candidate.starts_with(root) {
        Ok(())
    } else {
        Err("Resolved path is outside the vault.".to_string())
    }
}

fn write_file_checked(path: &Path, content: &str, expected_modified_ms: Option<u128>) -> Result<WriteResult, String> {
    if let Some(expected) = expected_modified_ms {
        if let Some(current) = modified_ms(path) {
            if current != expected {
                return Ok(WriteResult {
                    ok: false,
                    path: path.to_string_lossy().to_string(),
                    modified_ms: Some(current),
                    message: Some("File changed externally. Reload before saving.".to_string()),
                });
            }
        }
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let mut file = fs::File::create(path).map_err(|error| error.to_string())?;
    file.write_all(content.as_bytes())
        .map_err(|error| error.to_string())?;

    Ok(WriteResult {
        ok: true,
        path: path.to_string_lossy().to_string(),
        modified_ms: modified_ms(path),
        message: None,
    })
}

fn should_read_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.eq_ignore_ascii_case("md") || extension.eq_ignore_ascii_case("yaml"))
        .unwrap_or(false)
}

fn walk_vault(root: &Path, current: &Path, files: &mut Vec<VaultFile>, errors: &mut Vec<VaultReadError>) {
    let entries = match fs::read_dir(current) {
        Ok(entries) => entries,
        Err(error) => {
            let relative_path = current
                .strip_prefix(root)
                .unwrap_or(current)
                .to_string_lossy()
                .replace('\\', "/");
            errors.push(VaultReadError {
                relative_path,
                message: error.to_string(),
            });
            return;
        }
    };

    for entry in entries {
        match entry {
            Ok(entry) => {
                let path = entry.path();
                let file_name = entry.file_name();
                if file_name.to_string_lossy().starts_with('.') && file_name != ".everend" {
                    continue;
                }

                if path.is_dir() {
                    walk_vault(root, &path, files, errors);
                } else if should_read_file(&path) {
                    let relative_path = path
                        .strip_prefix(root)
                        .unwrap_or(&path)
                        .to_string_lossy()
                        .replace('\\', "/");

                    match fs::read_to_string(&path) {
                        Ok(content) => files.push(VaultFile {
                            relative_path,
                            absolute_path: path.to_string_lossy().to_string(),
                            content,
                            modified_ms: modified_ms(&path),
                        }),
                        Err(error) => errors.push(VaultReadError {
                            relative_path,
                            message: error.to_string(),
                        }),
                    }
                }
            }
            Err(error) => errors.push(VaultReadError {
                relative_path: current
                    .strip_prefix(root)
                    .unwrap_or(current)
                    .to_string_lossy()
                    .replace('\\', "/"),
                message: error.to_string(),
            }),
        }
    }
}

fn read_vault(root: PathBuf) -> Result<VaultReadResult, String> {
    if !root.exists() {
        return Err(format!("Vault path does not exist: {}", root.display()));
    }

    if !root.is_dir() {
        return Err(format!("Vault path is not a directory: {}", root.display()));
    }

    let mut files = Vec::new();
    let mut errors = Vec::new();
    walk_vault(&root, &root, &mut files, &mut errors);
    files.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));

    Ok(VaultReadResult {
        root_path: root.to_string_lossy().to_string(),
        files,
        errors,
    })
}

#[tauri::command]
async fn open_vault_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    Ok(app
        .dialog()
        .file()
        .blocking_pick_folder()
        .map(|path| path.to_string()))
}

#[tauri::command]
fn index_vault(path: String) -> Result<VaultReadResult, String> {
    read_vault(PathBuf::from(path))
}

#[tauri::command]
fn read_file(path: String) -> Result<VaultFile, String> {
    let path = PathBuf::from(path);
    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    Ok(VaultFile {
        relative_path: path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_default(),
        absolute_path: path.to_string_lossy().to_string(),
        content,
        modified_ms: modified_ms(&path),
    })
}

#[tauri::command]
fn create_universe(vault_path: String, name: String) -> Result<WriteResult, String> {
    let root = PathBuf::from(vault_path);
    let segment = sanitize_segment(&name)?;
    let path = root.join(segment);
    ensure_inside(&root, &path)?;
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(WriteResult {
        ok: true,
        path: path.to_string_lossy().to_string(),
        modified_ms: modified_ms(&path),
        message: None,
    })
}

#[tauri::command]
fn create_folder(vault_path: String, relative_path: String) -> Result<WriteResult, String> {
    let root = PathBuf::from(vault_path);
    let relative = normalize_relative_path(&relative_path)?;
    let path = root.join(relative);
    ensure_inside(&root, &path)?;
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(WriteResult {
        ok: true,
        path: path.to_string_lossy().to_string(),
        modified_ms: modified_ms(&path),
        message: None,
    })
}

#[tauri::command]
fn create_entity(
    vault_path: String,
    universe_path: String,
    folder_path: String,
    entity_type: String,
    name: String,
) -> Result<WriteResult, String> {
    let root = PathBuf::from(&vault_path);
    let universe = normalize_relative_path(&universe_path)?;
    let folder = if folder_path.trim().is_empty() {
        PathBuf::new()
    } else {
        normalize_relative_path(&folder_path)?
    };
    let safe_type = sanitize_segment(&entity_type)?;
    let safe_name = name.trim();
    if safe_name.is_empty() {
        return Err("Entity name is required.".to_string());
    }

    let slug = slugify(safe_name);
    if slug.is_empty() {
        return Err("Entity name must contain at least one alphanumeric character.".to_string());
    }

    let target_dir = root.join(universe).join(folder);
    let path = target_dir.join(format!("{slug}.md"));
    ensure_inside(&root, &path)?;
    if path.exists() {
        return Ok(WriteResult {
            ok: false,
            path: path.to_string_lossy().to_string(),
            modified_ms: modified_ms(&path),
            message: Some("Entity file already exists.".to_string()),
        });
    }

    let template_path = root
        .join(".everend")
        .join("templates")
        .join(format!("{safe_type}.md"));
    let default_id = slug.clone();
    let content = if template_path.exists() {
        fs::read_to_string(template_path)
            .map_err(|error| error.to_string())?
            .replace("{{id}}", &default_id)
            .replace("{{type}}", &safe_type)
            .replace("{{name}}", safe_name)
            .replace("{{status}}", "draft")
    } else {
        format!(
            "---\nid: {default_id}\ntype: {safe_type}\nname: {safe_name}\nstatus: draft\n---\n\n# {safe_name}\n"
        )
    };

    write_file_checked(&path, &content, None)
}

#[tauri::command]
fn save_file(path: String, content: String, expected_modified_ms: Option<u128>) -> Result<WriteResult, String> {
    write_file_checked(&PathBuf::from(path), &content, expected_modified_ms)
}

#[tauri::command]
fn save_taxonomy(
    vault_path: String,
    taxonomy_yaml: String,
    expected_modified_ms: Option<u128>,
) -> Result<WriteResult, String> {
    let root = PathBuf::from(&vault_path);
    let path = root.join(".everend").join("taxonomy.yaml");
    ensure_inside(&root, &path)?;
    write_file_checked(&path, &taxonomy_yaml, expected_modified_ms)
}

#[tauri::command]
fn save_template(
    vault_path: String,
    entity_type: String,
    content: String,
    expected_modified_ms: Option<u128>,
) -> Result<WriteResult, String> {
    let root = PathBuf::from(&vault_path);
    let safe_type = sanitize_segment(&entity_type)?;
    let path = root.join(".everend").join("templates").join(format!("{safe_type}.md"));
    ensure_inside(&root, &path)?;
    write_file_checked(&path, &content, expected_modified_ms)
}

#[tauri::command]
fn list_theme_files(vault_path: String) -> Result<Vec<ThemeManifest>, String> {
    let root = PathBuf::from(&vault_path);
    let theme_dir = root.join(".everend").join("themes");
    if !theme_dir.exists() {
        return Ok(Vec::new());
    }

    ensure_inside(&root, &theme_dir)?;
    let mut themes = Vec::new();
    for entry in fs::read_dir(theme_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("");
        if extension != "css" && extension != "json" {
            continue;
        }

        let relative_path = path
            .strip_prefix(&root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        let name = path
            .file_stem()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_else(|| relative_path.clone());

        themes.push(ThemeManifest {
            name,
            relative_path,
            absolute_path: path.to_string_lossy().to_string(),
            content: fs::read_to_string(&path).map_err(|error| error.to_string())?,
            kind: extension.to_string(),
        });
    }
    themes.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(themes)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_vault_dialog,
            index_vault,
            read_file,
            create_universe,
            create_folder,
            create_entity,
            save_file,
            save_taxonomy,
            save_template,
            list_theme_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
