# 🧠 MemoryScope AI – Virtual Memory Optimization Simulator

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![No Backend](https://img.shields.io/badge/Backend-None-2ecc71?style=flat-square)]()

> An interactive, browser-based simulator that visualizes and compares **FIFO**, **LRU**, and **Optimal** page replacement algorithms used in operating system memory management.

---

## 🚀 Features

| Feature | Details |
|---|---|
| **3 Algorithms** | FIFO, LRU, Optimal (OPT/MIN) |
| **Step-by-step tables** | Frame state after every page reference |
| **Color-coded rows** | 🔴 Page Fault · 🟢 Page Hit |
| **Algorithm stats** | Faults, Hits, Hit Ratio |
| **Interactive charts** | Bar (faults) + Doughnut (hit ratios) via Chart.js |
| **Algorithm comparison** | Summary cards + best-algorithm callout |
| **Dark / Light mode** | Persisted in `localStorage` + respects `prefers-color-scheme` |
| **Quick presets** | 3 classic examples pre-loaded |
| **Smooth animations** | Staggered row entrance, floating hero orbs, counter roll-up |
| **Responsive design** | Mobile-first, works on any screen size |
| **Error handling** | Real-time input validation with inline error messages |
| **Accessibility** | ARIA roles, labels, `focus-visible` styles, semantic HTML |
| **Zero backend** | Runs entirely in the browser — no server needed |

---

## 📁 Project Structure

```
Memory-Algorithm-Visualizer/
│
├── index.html      ← Main HTML (navbar, hero, simulator, about, footer)
├── style.css       ← All styling (CSS variables, dark/light themes, animations)
├── script.js       ← All logic (algorithms, rendering, charts, UI events)
└── README.md       ← This file
```

---

## 🏃 How to Run Locally

### Option 1 – Just open the file (simplest)
```
Double-click index.html
```
It opens directly in your browser. No installation or server needed.

### Option 2 – Live Server (VS Code extension, recommended)
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. Browser auto-refreshes on every save

---

## 🧮 Algorithms Explained

### 🔄 FIFO – First In, First Out
The oldest page in memory is replaced first (like a queue).

- **Advantage:** Simple and easy to implement
- **Disadvantage:** Susceptible to **Bélády's anomaly** (more frames can cause more faults)
- **Time complexity:** O(n) · **Space:** O(f)

**Example:**  
Reference string: `7 0 1 2 0 3 0 4` · Frames: 3  
FIFO → **6 faults**

---

### 🕰 LRU – Least Recently Used
Replaces the page that has not been used for the longest time.

- **Advantage:** Closely approximates Optimal; no Bélády's anomaly
- **Disadvantage:** Higher implementation overhead (requires tracking access history)
- **Time complexity:** O(n) · **Space:** O(f)

---

### 🎯 Optimal Page Replacement (OPT / MIN)
Replaces the page that will not be needed for the longest time in the future.

- **Advantage:** Produces the **theoretical minimum** number of page faults
- **Disadvantage:** Requires future knowledge — **cannot be implemented in real OS**; used as a benchmark
- **Time complexity:** O(n²) · **Space:** O(f)

---

## 🕹 How to Use the Simulator

1. **Enter** a comma-separated page reference string (e.g. `7, 0, 1, 2, 0, 3`)
2. **Set** the number of memory frames (1–10)
3. Click **Run Simulation** (or press **Enter**)
4. Browse the **FIFO**, **LRU**, and **Optimal** tabs to inspect each result
5. Open the **📊 Compare** tab for charts and the best-algorithm recommendation
6. Click **Reset** to start fresh, or pick a **Quick Preset** to try classics

---

## 🎨 UI Highlights

- **Dark/Light mode** toggle — preference saved between sessions
- **Glassmorphism navbar** with backdrop blur
- **Animated floating orbs** in the hero section
- **Staggered table rows** animate in with `60ms` delays per row
- **Chart.js** bar and doughnut charts update live with each simulation
- **Scroll-to-top** button appears after scrolling
- **Intersection Observer** triggers fade-in for about cards

---

## 📄 Input Constraints

| Field | Rules |
|---|---|
| Page reference string | Comma-separated non-negative integers; max **50** references |
| Number of frames | Integer between **1** and **10** |

---

## 🛠 Technologies Used

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic structure, ARIA accessibility |
| **CSS3** | Custom properties, animations, responsive grid |
| **Vanilla JavaScript (ES2020+)** | Algorithm logic, DOM manipulation, event handling |
| **[Chart.js 4](https://www.chartjs.org/)** | Bar and doughnut comparison charts (CDN) |
| **[Google Fonts – Inter & JetBrains Mono](https://fonts.google.com/)** | Typography |

---

## 🔗 Possible Enhancements

- [ ] Add **Clock / NRU** algorithm
- [ ] Export results as **CSV / PDF**
- [ ] Animated frame-by-frame **step player** with play/pause
- [ ] **Bélády's anomaly detector** with visual indicator
- [ ] Persist last simulation in `localStorage`
- [ ] Unit tests with **Jest**

---

## 👨‍💻 Author
- Shreya Mohanta
- Soumya Singh

---

## 📜 License

MIT License — free to use, modify, and distribute.
