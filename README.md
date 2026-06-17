<p align="center">
<a href="https://github.com/huesss/sc-desktop-beautiful/releases/latest">
<img src="desktop/src-tauri/icons/128x128.png" width="180px" style="border-radius: 50%;" />
</a>
</p>

<h1 align="center"><a href="https://github.com/huesss/sc-desktop-beautiful">SC Desktop Beautiful</a></h1>

<p align="center">
<b>Красивый нативный клиент SoundCloud для десктопа</b><br>
Glass UI · Без рекламы · Без капчи · Tauri 2 + React 19
</p>

<p align="center">
<a href="https://github.com/huesss/sc-desktop-beautiful/releases/latest">
<img src="https://img.shields.io/github/v/release/huesss/sc-desktop-beautiful?style=for-the-badge&logo=github&color=FF5500&label=VERSION" alt="Version"/>
</a>
<a href="https://github.com/huesss/sc-desktop-beautiful/releases">
<img src="https://img.shields.io/github/downloads/huesss/sc-desktop-beautiful/total?style=for-the-badge&logo=download&color=FF5500&label=Downloads" alt="Downloads"/>
</a>
<a href="https://github.com/huesss/sc-desktop-beautiful/stargazers">
<img src="https://img.shields.io/github/stars/huesss/sc-desktop-beautiful?style=for-the-badge&logo=github&color=FF5500&label=Stars" alt="Stars"/>
</a>
<a href="https://github.com/huesss/sc-desktop-beautiful/blob/main/LICENSE">
<img src="https://img.shields.io/badge/License-MIT-FF5500?style=for-the-badge" alt="License"/>
</a>
</p>

<p align="center">
<a href="https://github.com/huesss/sc-desktop-beautiful/releases/latest">
<img src="https://img.shields.io/badge/Скачать-Последнюю_Версию-FF5500?style=for-the-badge" alt="Download"/>
</a>
</p>

---

<p align="center">
<img src="screenshots/1.png" alt="Главная — рекомендации и быстрый доступ" width="90%" />
</p>

---

## Что это?

**SC Desktop Beautiful** — десктопное приложение для SoundCloud с переработанным интерфейсом: тёмная тема, glass-панели, акцентный розовый цвет и плавная анимация. Сборка на **Tauri 2** и **React 19** — нативно, легко и без Electron.

Текущая версия: **PreRelease v1**. Платформы: **Windows**, **Linux**, **macOS**.

---

## Возможности

### Интерфейс

- Glass UI с размытым фоном и читаемыми панелями
- Быстрый доступ: Liked Songs, Library, плейлисты из сайдбара
- Таблица лайков в стиле Spotify — сортировка, фильтр, обложки
- Экран **My SC** с крупным плеером и визуализацией
- Настройки: язык (EN / RU / TR), кэш аудио и обложек, офлайн-лайки

### Музыка и система

- Воспроизведение через нативный аудиодвижок (rodio)
- Очередь, шаффл, repeat, эквалайзер, lyrics, vibe search
- Discord Rich Presence, MPRIS / системные медиа-кнопки
- Кэш треков и защищённая папка для лайков
- Автообновления через GitHub Releases

### Доступность

- Работает без рекламы и капчи веб-клиента
- Обход региональных ограничений SoundCloud
- Интерфейс на русском, английском и турецком

---

## Скачать

Сборки — на [странице релизов](https://github.com/huesss/sc-desktop-beautiful/releases/latest).

### Windows

- **`.exe`** (NSIS) — рекомендуется
- **`.msi`** — альтернатива

Требования: Windows 10 (1809+) или Windows 11

### Linux

| Формат | Архитектура | Описание |
|--------|-------------|----------|
| `.deb` | amd64, arm64 | Debian, Ubuntu, Mint |
| `.rpm` | amd64, arm64 | Fedora, openSUSE |
| `.AppImage` | amd64, arm64 | Универсальный |
| `.flatpak` | amd64 | Flatpak |

```bash
chmod +x sc-desktop-beautiful-*.AppImage
./sc-desktop-beautiful-*.AppImage
```

### macOS

- **Apple Silicon**: `*_arm64.dmg`
- **Intel**: `*_x64.dmg`

> [!NOTE]
> Если Gatekeeper блокирует запуск:
> ```bash
> xattr -cr /Applications/sc-desktop-beautiful.app
> ```

---

## Скриншоты

<p align="center">
<img src="screenshots/1.png" alt="Главная" width="45%" />
<img src="screenshots/5.png" alt="Liked Songs" width="45%" />
</p>

<p align="center">
<img src="screenshots/2.png" alt="My SC" width="45%" />
<img src="screenshots/8.png" alt="Плейлист" width="45%" />
</p>

<p align="center">
<img src="screenshots/7.png" alt="Library" width="45%" />
<img src="screenshots/10.png" alt="Настройки" width="45%" />
</p>

---

## Обратная связь

| | |
|---|---|
| Баг или идея | [Issues](https://github.com/huesss/sc-desktop-beautiful/issues) |
| Обсуждения | [Discussions](https://github.com/huesss/sc-desktop-beautiful/discussions) |
| Звезда репо | [Stargazers](https://github.com/huesss/sc-desktop-beautiful/stargazers) |

Pull requests приветствуются. Для крупных изменений сначала открой issue.

---

## Сборка из исходников

<details>
<summary><b>Инструкция для разработчиков</b></summary>

### Требования

- **Node.js** 22+
- **pnpm** 10+
- **Rust** 1.77+ (stable)

### Запуск

```bash
git clone https://github.com/huesss/sc-desktop-beautiful.git
cd sc-desktop-beautiful/desktop
pnpm install
pnpm tauri dev
```

### Production-сборка

```bash
pnpm tauri build
```

Артефакты: `desktop/src-tauri/target/release/bundle/`.

### Проверки

```bash
npx tsc --noEmit
cargo check --manifest-path src-tauri/Cargo.toml
npx biome check src/
```

</details>

---

## Стек

| Компонент | Технология |
|-----------|------------|
| Оболочка | Tauri 2 (Rust) |
| Фронтенд | React 19, Vite 7, Tailwind CSS 4 |
| Стейт | Zustand, TanStack Query |
| Аудио | rodio |
| UI | Radix UI |
| Бэкенд | NestJS, PostgreSQL |
| CI/CD | GitHub Actions |
| Линтер | Biome |

---

## Статистика

<p align="center">
<img src="https://api.star-history.com/svg?repos=huesss/sc-desktop-beautiful&type=Date" alt="Star History" />
</p>

<p align="center">
<img src="https://img.shields.io/github/commit-activity/m/huesss/sc-desktop-beautiful?style=for-the-badge&color=FF5500" alt="Commits" />
<img src="https://img.shields.io/github/issues/huesss/sc-desktop-beautiful?style=for-the-badge&color=FF5500" alt="Issues" />
<img src="https://img.shields.io/github/forks/huesss/sc-desktop-beautiful?style=for-the-badge&color=FF5500" alt="Forks" />
</p>

---

## Лицензия

MIT — см. [LICENSE](LICENSE).

SoundCloud — торговая марка SoundCloud Ltd. Проект не аффилирован с SoundCloud.

---

<p align="center">
<code>sc desktop beautiful</code> · <code>soundcloud desktop</code> · <code>soundcloud клиент</code> · <code>soundcloud для пк</code> · <code>soundcloud без рекламы</code> · <code>soundcloud tauri</code> · <code>glass ui music player</code>
</p>

<p align="center">
<a href="https://github.com/huesss/sc-desktop-beautiful/releases/latest">
<img src="https://img.shields.io/badge/Скачать_SC_Desktop_Beautiful-FF5500?style=for-the-badge&logoColor=white" alt="Download" height="50"/>
</a>
</p>
