use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub struct AppState {
    pub http: reqwest::Client,
    pub sessions: Mutex<HashMap<String, u64>>,
    pub idle_sleep_secs: AtomicU64,
}

impl AppState {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(15))
            .timeout(Duration::from_secs(120))
            .pool_max_idle_per_host(4)
            .build()
            .expect("No se pudo inicializar reqwest::Client compartido");

        Self {
            http,
            sessions: Mutex::new(HashMap::new()),
            idle_sleep_secs: AtomicU64::new(10 * 60),
        }
    }

    pub fn now_epoch_secs() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
    }

    pub fn touch_session(&self, uuid: &str) {
        if let Ok(mut map) = self.sessions.lock() {
            map.insert(uuid.to_string(), Self::now_epoch_secs());
        }
    }

    pub fn remove_session(&self, uuid: &str) {
        if let Ok(mut map) = self.sessions.lock() {
            map.remove(uuid);
        }
    }

    pub fn clear_sessions(&self) {
        if let Ok(mut map) = self.sessions.lock() {
            map.clear();
        }
    }

    pub fn set_idle_sleep_minutes(&self, minutes: u64) {
        self.idle_sleep_secs
            .store(minutes.saturating_mul(60), Ordering::Relaxed);
    }
}
