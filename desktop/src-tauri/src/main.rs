
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "linux")]
fn apply_linux_gpu_workarounds() {
    let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok()
        || std::env::var("XDG_SESSION_TYPE")
            .map(|v| v == "wayland")
            .unwrap_or(false);

    if !is_wayland {
        return;
    }

    let has_nvidia = std::path::Path::new("/proc/driver/nvidia/version").exists()
        || std::fs::read_to_string("/proc/modules")
            .map(|m| m.contains("nvidia"))
            .unwrap_or(false);

    if !has_nvidia {
        return;
    }

    println!("[GPU] NVIDIA + Wayland detected, applying WebKitGTK workarounds");

    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "0");
    }

    if std::env::var("__NV_DISABLE_EXPLICIT_SYNC").is_err() {
        std::env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");
    }
}

#[cfg(target_os = "linux")]
fn raise_linux_nofile_limit() {
    let mut limit = libc::rlimit {
        rlim_cur: 0,
        rlim_max: 0,
    };

    unsafe {
        if libc::getrlimit(libc::RLIMIT_NOFILE, &mut limit) != 0 {
            eprintln!("[FD] getrlimit(RLIMIT_NOFILE) failed");
            return;
        }
    }

    if limit.rlim_cur >= limit.rlim_max {
        return;
    }

    let next = libc::rlimit {
        rlim_cur: limit.rlim_max,
        rlim_max: limit.rlim_max,
    };

    unsafe {
        if libc::setrlimit(libc::RLIMIT_NOFILE, &next) == 0 {
            println!(
                "[FD] Raised RLIMIT_NOFILE soft limit: {} -> {}",
                limit.rlim_cur, next.rlim_cur
            );
        } else {
            eprintln!(
                "[FD] Failed to raise RLIMIT_NOFILE soft limit: {} -> {}",
                limit.rlim_cur, next.rlim_cur
            );
        }
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    {
        apply_linux_gpu_workarounds();
        raise_linux_nofile_limit();
    }

    soundcloud_desktop_lib::run()
}
