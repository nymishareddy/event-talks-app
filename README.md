# BigQuery Release Notes Radar

A premium, modern dark-mode dashboard built with **Python Flask**, **Vanilla JS**, and **CSS** that fetches, parses, and formats Google Cloud BigQuery release notes. The app splits daily release entries into individual feature, issue, and change items, allowing users to search, filter, and draft custom tweets directly to X (Twitter).

---

## 🚀 Key Features

* **Vibrant Glassmorphic UI**: High-fidelity dark mode with neon accents and micro-animations matched to the Google Cloud brand palette.
* **Granular Release Parsing**: Splits composite daily release notes into distinct sub-cards (e.g., Features, Issues, Changed, Resolved, Deprecated) for focused inspection and sharing.
* **Instant Search & Badges**: Filter updates in real-time by category badges or search for keywords (e.g., *Gemini*, *SQL*, *pricing*).
* **Smart Tweet Composer**:
  - Auto-generates structured tweets with predefined hashtags (`#BigQuery #GoogleCloud`).
  - Active character progress ring counting down the 280-character limit.
  - One-click **Shorten** and **Reset** utility buttons.
  - Seamless redirection to the official X/Twitter Web Intent.
* **Manual Live Refresh**: Instantly fetch the latest release notes from the Google XML feed with active loading animations and toast alerts.

---

## 📂 Project Structure

```text
my-project/
├── static/
│   ├── css/
│   │   └── style.css      # Custom stylesheet for glassmorphism layout
│   └── js/
│       └── app.js         # Handles DOM parsing, state, filters, and Tweet composer
├── templates/
│   └── index.html         # Main dashboard markup (Outfit font & Material icons)
├── .gitignore             # Ignores byte-caches, local virtual envs, and IDE settings
├── app.py                 # Flask server with feed parsing and JSON API endpoint
├── hello.txt              # Project welcome file
└── README.md              # Documentation (This file)
```

---

## 🛠️ Requirements & Installation

1. **Python 3.8+** must be installed on your system.
2. Install **Flask**:
   ```bash
   pip install flask
   ```

---

## 💻 How to Run

1. Clone or download the repository files:
   ```bash
   git clone https://github.com/nymishareddy/event-talks-app.git
   cd event-talks-app
   ```
2. Start the Flask application:
   ```bash
   python app.py
   ```
3. Open your browser and navigate to:
   [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

---

## 📝 XML Feed Source
The release data is fetched in real-time from the Google Cloud Feeds API:
[https://docs.cloud.google.com/feeds/bigquery-release-notes.xml](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)
