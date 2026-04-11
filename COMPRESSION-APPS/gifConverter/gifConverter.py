#!/usr/bin/env python3
"""
gifConverter.py
===============
Drop any movie file into the gifConverter folder alongside this script.
Run this script and it will detect the file, let you configure all
conversion settings, then output an optimised GIF into the GIFS folder
and move the original into Processed-Clips.

Dependencies (auto-checked on startup):
  • ffmpeg   – video decoding / palette generation
  • gifsicle – GIF optimisation and loop control
  • Pillow   – thumbnail preview
  • tkinter  – GUI (stdlib on most systems)

Usage:
  python3 gifConverter.py
"""

import os
import sys
import glob
import shutil
import subprocess
import threading
import tempfile
import time
import platform
from pathlib import Path

# ---------------------------------------------------------------------------
# Tkinter import with helpful error message
# ---------------------------------------------------------------------------
try:
    import tkinter as tk
    from tkinter import ttk, messagebox, font as tkfont
except ImportError:
    print("ERROR: tkinter is not available.")
    print("Install it with:  sudo apt-get install python3-tk")
    sys.exit(1)

try:
    from PIL import Image, ImageTk
except ImportError:
    print("ERROR: Pillow is not installed.")
    print("Install it with:  pip3 install Pillow")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Constants & safe limits
# ---------------------------------------------------------------------------
SCRIPT_DIR   = Path(__file__).resolve().parent
GIFS_DIR     = SCRIPT_DIR / "GIFS"
ARCHIVE_DIR  = SCRIPT_DIR / "Processed-Clips"
SUPPORTED    = {".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv",
                ".webm", ".m4v", ".mpg", ".mpeg", ".3gp", ".ts"}

# Safe upper limits to prevent runaway file sizes / memory exhaustion
MAX_FPS      = 24       # frames per second hard cap
MAX_WIDTH    = 1280     # pixel width hard cap
MAX_DURATION = 120      # seconds hard cap for GIF duration
MAX_COLOURS  = 256      # GIF palette max
MIN_FPS      = 1
MIN_WIDTH    = 64

APP_BG       = "#1e1e2e"
PANEL_BG     = "#2a2a3e"
ACCENT       = "#7c6af7"
ACCENT2      = "#a78bfa"
TEXT_FG      = "#e2e8f0"
TEXT_DIM     = "#94a3b8"
SUCCESS      = "#4ade80"
WARNING      = "#fbbf24"
DANGER       = "#f87171"
ENTRY_BG     = "#12121f"
BTN_BG       = "#3b3b55"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def check_dependency(cmd: str) -> bool:
    try:
        subprocess.run([cmd, "-version"], capture_output=True, timeout=5)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def get_video_info(path: Path) -> dict:
    """Return duration, width, height, fps via ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams", "-show_format",
        str(path)
    ]
    try:
        import json
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        info = {"duration": 0.0, "width": 0, "height": 0, "fps": 0.0}
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                info["width"]  = int(stream.get("width", 0))
                info["height"] = int(stream.get("height", 0))
                # Parse fps fraction e.g. "30000/1001"
                fps_str = stream.get("r_frame_rate", "0/1")
                try:
                    num, den = fps_str.split("/")
                    info["fps"] = round(float(num) / float(den), 2) if float(den) else 0.0
                except Exception:
                    info["fps"] = 0.0
                break
        fmt = data.get("format", {})
        info["duration"] = float(fmt.get("duration", 0))
        return info
    except Exception:
        return {"duration": 0.0, "width": 0, "height": 0, "fps": 0.0}


def extract_thumbnail(video_path: Path, timestamp: float = 1.0) -> Image.Image | None:
    """Extract a single frame as a PIL Image for preview."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(timestamp), "-i", str(video_path),
             "-vframes", "1", "-q:v", "2", tmp_path],
            capture_output=True, timeout=15
        )
        if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
            img = Image.open(tmp_path).copy()
            os.unlink(tmp_path)
            return img
    except Exception:
        pass
    return None


def format_size(nbytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if nbytes < 1024:
            return f"{nbytes:.1f} {unit}"
        nbytes /= 1024
    return f"{nbytes:.1f} GB"


def format_time(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def estimate_gif_size(duration_s: float, fps: int, width_px: int,
                      src_height: int, src_width: int,
                      colours: int, lossy: int,
                      boomerang: bool) -> tuple[int, int, int]:
    """
    Return (low_bytes, mid_bytes, high_bytes) estimated GIF file size.

    Model rationale
    ---------------
    An uncompressed GIF frame is roughly  width × height  bytes (1 byte/pixel
    after palette indexing).  LZW compression on photographic content typically
    achieves 40–70 % reduction; gifsicle optimisation and lossy compression add
    further savings.  We combine these into a single empirical factor and then
    apply a ±30 % confidence band.

    Factors that increase size  : more frames, larger resolution, more colours.
    Factors that decrease size  : lossy compression, fewer colours, high dither
                                  (dither is not passed — it has minor impact).
    Boomerang doubles the frame count.
    """
    if duration_s <= 0 or fps <= 0 or width_px <= 0:
        return 0, 0, 0

    # Derive output height preserving source aspect ratio
    if src_width > 0 and src_height > 0:
        height_px = max(1, int(width_px * src_height / src_width))
    else:
        height_px = int(width_px * 9 / 16)   # assume 16:9 if unknown

    frame_count = int(duration_s * fps)
    if boomerang:
        frame_count *= 2
    frame_count = max(1, frame_count)

    # Raw bytes per frame (palette-indexed, pre-LZW)
    raw_bytes_per_frame = width_px * height_px

    # LZW compression ratio: photographic content ~0.45, flat/simple ~0.25
    # Use colour count as a proxy for content complexity
    colour_ratio = colours / 256.0          # 0–1
    lzw_ratio    = 0.28 + 0.22 * colour_ratio  # 0.28 – 0.50

    # Lossy factor: lossy=0 → 1.0 (no extra saving), lossy=200 → ~0.35
    lossy_factor = max(0.35, 1.0 - (lossy / 200.0) * 0.65)

    # gifsicle -O3 inter-frame delta compression: saves ~15–30 % on motion
    opt_factor   = 0.80

    compressed_bytes = (raw_bytes_per_frame * frame_count
                        * lzw_ratio * lossy_factor * opt_factor)

    # GIF overhead: header + colour table + per-frame metadata (~10 bytes/frame)
    overhead = 800 + frame_count * 10

    mid   = int(compressed_bytes + overhead)
    low   = int(mid * 0.70)   # optimistic
    high  = int(mid * 1.40)   # pessimistic

    return low, mid, high


def size_colour(mid_bytes: int) -> str:
    """Return a hex colour string based on estimated size."""
    mb = mid_bytes / (1024 * 1024)
    if mb < 2:    return SUCCESS   # green  — small
    if mb < 8:    return WARNING   # amber  — moderate
    return DANGER                  # red    — large

# ---------------------------------------------------------------------------
# Main Application
# ---------------------------------------------------------------------------

class GifConverterApp:

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("GIF Converter")
        self.root.configure(bg=APP_BG)
        self.root.resizable(True, True)
        self.root.minsize(760, 680)

        self._setup_styles()
        self._build_ui()
        self._scan_for_files()

    # ------------------------------------------------------------------
    # Styles
    # ------------------------------------------------------------------

    def _setup_styles(self):
        style = ttk.Style(self.root)
        style.theme_use("clam")

        style.configure("TFrame",        background=APP_BG)
        style.configure("Panel.TFrame",  background=PANEL_BG)
        style.configure("TLabel",        background=APP_BG,    foreground=TEXT_FG,
                         font=("Helvetica", 11))
        style.configure("Panel.TLabel",  background=PANEL_BG,  foreground=TEXT_FG,
                         font=("Helvetica", 11))
        style.configure("Dim.TLabel",    background=PANEL_BG,  foreground=TEXT_DIM,
                         font=("Helvetica", 10))
        style.configure("Title.TLabel",  background=APP_BG,    foreground=ACCENT2,
                         font=("Helvetica", 20, "bold"))
        style.configure("Section.TLabel",background=PANEL_BG,  foreground=ACCENT2,
                         font=("Helvetica", 12, "bold"))
        style.configure("Info.TLabel",   background=PANEL_BG,  foreground=TEXT_DIM,
                         font=("Helvetica", 10))
        style.configure("Success.TLabel",background=PANEL_BG,  foreground=SUCCESS,
                         font=("Helvetica", 10, "bold"))
        style.configure("Warning.TLabel",background=PANEL_BG,  foreground=WARNING,
                         font=("Helvetica", 10, "bold"))
        style.configure("Danger.TLabel", background=PANEL_BG,  foreground=DANGER,
                         font=("Helvetica", 10, "bold"))

        style.configure("TScale",        background=PANEL_BG,  troughcolor=ENTRY_BG,
                         sliderlength=18, sliderrelief="flat")
        style.map("TScale", background=[("active", ACCENT)])

        style.configure("TCheckbutton",  background=PANEL_BG,  foreground=TEXT_FG,
                         font=("Helvetica", 11), indicatorcolor=ENTRY_BG)
        style.map("TCheckbutton",
                  indicatorcolor=[("selected", ACCENT), ("!selected", ENTRY_BG)],
                  foreground=[("active", ACCENT2)])

        style.configure("TCombobox",     fieldbackground=ENTRY_BG, background=BTN_BG,
                         foreground=TEXT_FG, selectbackground=ACCENT,
                         font=("Helvetica", 11))
        style.map("TCombobox", fieldbackground=[("readonly", ENTRY_BG)])

        style.configure("TProgressbar",  troughcolor=ENTRY_BG, background=ACCENT,
                         thickness=14)

        style.configure("Convert.TButton", background=ACCENT, foreground="#ffffff",
                         font=("Helvetica", 13, "bold"), padding=(20, 10),
                         relief="flat", borderwidth=0)
        style.map("Convert.TButton",
                  background=[("active", ACCENT2), ("disabled", BTN_BG)],
                  foreground=[("disabled", TEXT_DIM)])

        style.configure("Refresh.TButton", background=BTN_BG, foreground=TEXT_FG,
                         font=("Helvetica", 10), padding=(8, 5),
                         relief="flat", borderwidth=0)
        style.map("Refresh.TButton",
                  background=[("active", ACCENT)])

    # ------------------------------------------------------------------
    # UI Construction
    # ------------------------------------------------------------------

    def _build_ui(self):
        # ---- Header ----
        header = ttk.Frame(self.root, style="TFrame", padding=(20, 16, 20, 8))
        header.pack(fill="x")
        ttk.Label(header, text="🎞  GIF Converter", style="Title.TLabel").pack(side="left")
        ttk.Label(header,
                  text="Drop a movie file into this folder, configure settings, then convert.",
                  style="TLabel", foreground=TEXT_DIM).pack(side="left", padx=(16, 0))

        sep = tk.Frame(self.root, bg=ACCENT, height=2)
        sep.pack(fill="x", padx=20)

        # ---- Main scrollable body ----
        body = ttk.Frame(self.root, style="TFrame", padding=(16, 10))
        body.pack(fill="both", expand=True)
        body.columnconfigure(0, weight=1)
        body.columnconfigure(1, weight=1)
        body.rowconfigure(0, weight=1)   # allow vertical expansion

        # Left column
        left = ttk.Frame(body, style="TFrame")
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 8))

        # Right column — must expand so the preview canvas can grow
        right = ttk.Frame(body, style="TFrame")
        right.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        self._build_file_panel(left)
        self._build_trim_panel(left)
        self._build_output_panel(right)
        self._build_advanced_panel(right)
        self._build_preview_panel(right)

        # ---- Bottom bar ----
        bottom = ttk.Frame(self.root, style="TFrame", padding=(20, 8, 20, 4))
        bottom.pack(fill="x", side="bottom")

        # Size estimate strip above the progress bar
        size_strip = ttk.Frame(bottom, style="TFrame")
        size_strip.pack(fill="x", pady=(0, 6))

        ttk.Label(size_strip, text="Estimated output size:",
                  style="TLabel", foreground=TEXT_DIM).pack(side="left")

        self.est_size_bar_var = tk.StringVar(value="—  (no file loaded)")
        self.est_size_bar_lbl = tk.Label(
            size_strip,
            textvariable=self.est_size_bar_var,
            bg=APP_BG, fg=TEXT_DIM,
            font=("Helvetica", 12, "bold"),
            anchor="w",
        )
        self.est_size_bar_lbl.pack(side="left", padx=(10, 0))

        self.est_tip_var = tk.StringVar(value="")
        ttk.Label(size_strip, textvariable=self.est_tip_var,
                  style="TLabel", foreground=TEXT_DIM,
                  font=("Helvetica", 10)).pack(side="left", padx=(14, 0))

        # Progress bar + Convert button row
        ctrl_row = ttk.Frame(bottom, style="TFrame")
        ctrl_row.pack(fill="x")

        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(ctrl_row, variable=self.progress_var,
                                             maximum=100, style="TProgressbar",
                                             length=400)
        self.progress_bar.pack(side="left", fill="x", expand=True, padx=(0, 16))

        self.convert_btn = ttk.Button(ctrl_row, text="Convert to GIF",
                                       style="Convert.TButton",
                                       command=self._start_conversion)
        self.convert_btn.pack(side="right")

        self.status_var = tk.StringVar(value="Ready — drop a movie file into the gifConverter folder.")
        status_bar = tk.Label(self.root, textvariable=self.status_var,
                               bg=ENTRY_BG, fg=TEXT_DIM, anchor="w",
                               font=("Helvetica", 10), padx=12, pady=6)
        status_bar.pack(fill="x", side="bottom")

    # ------------------------------------------------------------------

    def _panel(self, parent, title: str) -> ttk.Frame:
        """Create a titled panel card."""
        outer = ttk.Frame(parent, style="TFrame", padding=(0, 0, 0, 12))
        outer.pack(fill="x")
        card = ttk.Frame(outer, style="Panel.TFrame", padding=(14, 12))
        card.pack(fill="x")
        ttk.Label(card, text=title, style="Section.TLabel").pack(anchor="w", pady=(0, 8))
        return card

    # ------------------------------------------------------------------

    def _build_file_panel(self, parent):
        card = self._panel(parent, "📂  Source File")

        row = ttk.Frame(card, style="Panel.TFrame")
        row.pack(fill="x")

        self.file_var = tk.StringVar(value="No file detected")
        file_label = tk.Label(row, textvariable=self.file_var,
                               bg=ENTRY_BG, fg=TEXT_FG,
                               font=("Helvetica", 10), anchor="w",
                               padx=8, pady=6, relief="flat")
        file_label.pack(side="left", fill="x", expand=True)

        refresh_btn = ttk.Button(row, text="⟳  Scan", style="Refresh.TButton",
                                  command=self._scan_for_files)
        refresh_btn.pack(side="right", padx=(8, 0))

        self.file_info_var = tk.StringVar(value="")
        ttk.Label(card, textvariable=self.file_info_var,
                  style="Dim.TLabel").pack(anchor="w", pady=(6, 0))

        self.detected_files: list[Path] = []
        self.selected_file: Path | None = None

        # File selector listbox (shown when multiple files)
        self.file_list_frame = ttk.Frame(card, style="Panel.TFrame")
        self.file_listbox = tk.Listbox(self.file_list_frame,
                                        bg=ENTRY_BG, fg=TEXT_FG,
                                        selectbackground=ACCENT,
                                        font=("Helvetica", 10),
                                        height=4, relief="flat",
                                        activestyle="none")
        self.file_listbox.pack(fill="x")
        self.file_listbox.bind("<<ListboxSelect>>", self._on_file_select)

    # ------------------------------------------------------------------

    def _build_trim_panel(self, parent):
        card = self._panel(parent, "✂️  Trim")

        self.video_duration = 0.0

        # Start time
        start_row = ttk.Frame(card, style="Panel.TFrame")
        start_row.pack(fill="x", pady=(0, 4))
        ttk.Label(start_row, text="Start (s)", style="Panel.TLabel", width=10).pack(side="left")
        self.trim_start_var = tk.DoubleVar(value=0.0)
        self.trim_start_scale = ttk.Scale(start_row, from_=0, to=120,
                                           variable=self.trim_start_var,
                                           orient="horizontal",
                                           command=self._on_trim_change)
        self.trim_start_scale.pack(side="left", fill="x", expand=True, padx=(8, 8))
        self.trim_start_lbl = ttk.Label(start_row, text="0.0s",
                                         style="Panel.TLabel", width=7)
        self.trim_start_lbl.pack(side="right")

        # End time
        end_row = ttk.Frame(card, style="Panel.TFrame")
        end_row.pack(fill="x", pady=(0, 4))
        ttk.Label(end_row, text="End (s)", style="Panel.TLabel", width=10).pack(side="left")
        self.trim_end_var = tk.DoubleVar(value=10.0)
        self.trim_end_scale = ttk.Scale(end_row, from_=0, to=120,
                                         variable=self.trim_end_var,
                                         orient="horizontal",
                                         command=self._on_trim_change)
        self.trim_end_scale.pack(side="left", fill="x", expand=True, padx=(8, 8))
        self.trim_end_lbl = ttk.Label(end_row, text="10.0s",
                                       style="Panel.TLabel", width=7)
        self.trim_end_lbl.pack(side="right")

        # Duration indicator
        self.trim_duration_var = tk.StringVar(value="GIF duration: 10.0s")
        ttk.Label(card, textvariable=self.trim_duration_var,
                  style="Dim.TLabel").pack(anchor="w", pady=(2, 0))

        # Safety warning
        self.trim_warn_var = tk.StringVar(value="")
        self.trim_warn_lbl = ttk.Label(card, textvariable=self.trim_warn_var,
                                        style="Warning.TLabel")
        self.trim_warn_lbl.pack(anchor="w")

    # ------------------------------------------------------------------

    def _build_output_panel(self, parent):
        card = self._panel(parent, "⚙️  Output Settings")

        def row(label_text, widget_builder):
            r = ttk.Frame(card, style="Panel.TFrame")
            r.pack(fill="x", pady=3)
            ttk.Label(r, text=label_text, style="Panel.TLabel", width=18).pack(side="left")
            widget_builder(r)
            return r

        # Frame rate
        def fps_widget(r):
            self.fps_var = tk.IntVar(value=15)
            scale = ttk.Scale(r, from_=MIN_FPS, to=MAX_FPS,
                               variable=self.fps_var, orient="horizontal",
                               command=lambda v: self._update_fps_label())
            scale.pack(side="left", fill="x", expand=True, padx=(8, 8))
            self.fps_lbl = ttk.Label(r, text="15 fps", style="Panel.TLabel", width=8)
            self.fps_lbl.pack(side="right")
        row("Frame Rate", fps_widget)

        # Playback speed
        def speed_widget(r):
            self.speed_var = tk.DoubleVar(value=1.0)
            speeds = ["0.25×", "0.5×", "0.75×", "1×", "1.25×", "1.5×", "2×", "3×", "4×"]
            self.speed_combo = ttk.Combobox(r, values=speeds, state="readonly",
                                             width=8, font=("Helvetica", 11))
            self.speed_combo.set("1×")
            self.speed_combo.pack(side="left", padx=(8, 0))
            self.speed_combo.bind("<<ComboboxSelected>>", self._update_size_estimate)
            ttk.Label(r, text="(relative to original)",
                      style="Dim.TLabel").pack(side="left", padx=(8, 0))
        row("Playback Speed", speed_widget)

        # Resolution width
        def res_widget(r):
            self.res_var = tk.IntVar(value=480)
            scale = ttk.Scale(r, from_=MIN_WIDTH, to=MAX_WIDTH,
                               variable=self.res_var, orient="horizontal",
                               command=lambda v: self._update_res_label())
            scale.pack(side="left", fill="x", expand=True, padx=(8, 8))
            self.res_lbl = ttk.Label(r, text="480 px", style="Panel.TLabel", width=8)
            self.res_lbl.pack(side="right")
        row("Width (px)", res_widget)

        # Colour depth
        def colours_widget(r):
            self.colours_var = tk.IntVar(value=128)
            scale = ttk.Scale(r, from_=8, to=MAX_COLOURS,
                               variable=self.colours_var, orient="horizontal",
                               command=lambda v: self._update_colours_label())
            scale.pack(side="left", fill="x", expand=True, padx=(8, 8))
            self.colours_lbl = ttk.Label(r, text="128 colours",
                                          style="Panel.TLabel", width=10)
            self.colours_lbl.pack(side="right")
        row("Colour Depth", colours_widget)

        # Loop mode
        def loop_widget(r):
            self.loop_var = tk.StringVar(value="Infinite loop")
            modes = ["Infinite loop", "Play once", "2 loops", "3 loops",
                     "5 loops", "10 loops"]
            combo = ttk.Combobox(r, values=modes, textvariable=self.loop_var,
                                  state="readonly", width=14, font=("Helvetica", 11))
            combo.pack(side="left", padx=(8, 0))
        row("Loop Mode", loop_widget)

        # Dither method
        def dither_widget(r):
            self.dither_var = tk.StringVar(value="sierra2_4a")
            methods = ["none", "bayer:bayer_scale=1", "bayer:bayer_scale=2",
                       "bayer:bayer_scale=3", "sierra2", "sierra2_4a"]
            combo = ttk.Combobox(r, values=methods, textvariable=self.dither_var,
                                  state="readonly", width=20, font=("Helvetica", 10))
            combo.pack(side="left", padx=(8, 0))
        row("Dither Method", dither_widget)

    # ------------------------------------------------------------------

    def _build_advanced_panel(self, parent):
        card = self._panel(parent, "🔧  Advanced Options")

        # Optimisation level
        opt_row = ttk.Frame(card, style="Panel.TFrame")
        opt_row.pack(fill="x", pady=3)
        ttk.Label(opt_row, text="Optimise Level", style="Panel.TLabel", width=18).pack(side="left")
        self.opt_var = tk.IntVar(value=3)
        for lvl, label in [(1, "Fast"), (2, "Good"), (3, "Best")]:
            ttk.Radiobutton(opt_row, text=label, variable=self.opt_var, value=lvl,
                             style="TCheckbutton").pack(side="left", padx=(8, 0))

        # Lossy compression
        lossy_row = ttk.Frame(card, style="Panel.TFrame")
        lossy_row.pack(fill="x", pady=3)
        ttk.Label(lossy_row, text="Lossy Compress", style="Panel.TLabel", width=18).pack(side="left")
        self.lossy_var = tk.IntVar(value=40)
        lossy_scale = ttk.Scale(lossy_row, from_=0, to=200,
                                 variable=self.lossy_var, orient="horizontal",
                                 command=lambda v: self._update_lossy_label())
        lossy_scale.pack(side="left", fill="x", expand=True, padx=(8, 8))
        self.lossy_lbl = ttk.Label(lossy_row, text="40", style="Panel.TLabel", width=5)
        self.lossy_lbl.pack(side="right")

        # Crop (optional)
        crop_row = ttk.Frame(card, style="Panel.TFrame")
        crop_row.pack(fill="x", pady=3)
        ttk.Label(crop_row, text="Crop (optional)", style="Panel.TLabel", width=18).pack(side="left")
        self.crop_var = tk.StringVar(value="")
        crop_entry = tk.Entry(crop_row, textvariable=self.crop_var,
                               bg=ENTRY_BG, fg=TEXT_FG, insertbackground=TEXT_FG,
                               font=("Helvetica", 10), relief="flat", width=20)
        crop_entry.pack(side="left", padx=(8, 0))
        ttk.Label(crop_row, text="W:H:X:Y  e.g. 640:360:0:60",
                  style="Dim.TLabel").pack(side="left", padx=(8, 0))

        # Reverse
        flags_row = ttk.Frame(card, style="Panel.TFrame")
        flags_row.pack(fill="x", pady=3)
        self.reverse_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(flags_row, text="Reverse playback",
                         variable=self.reverse_var,
                         style="TCheckbutton").pack(side="left")

        self.boomerang_var = tk.BooleanVar(value=False)
        self.boomerang_var.trace_add("write", self._update_size_estimate)
        ttk.Checkbutton(flags_row, text="Boomerang (forward + reverse)",
                         variable=self.boomerang_var,
                         style="TCheckbutton").pack(side="left", padx=(16, 0))

        # Output filename
        name_row = ttk.Frame(card, style="Panel.TFrame")
        name_row.pack(fill="x", pady=3)
        ttk.Label(name_row, text="Output Name", style="Panel.TLabel", width=18).pack(side="left")
        self.outname_var = tk.StringVar(value="")
        name_entry = tk.Entry(name_row, textvariable=self.outname_var,
                               bg=ENTRY_BG, fg=TEXT_FG, insertbackground=TEXT_FG,
                               font=("Helvetica", 10), relief="flat", width=28)
        name_entry.pack(side="left", padx=(8, 0))
        ttk.Label(name_row, text="(leave blank for auto)",
                  style="Dim.TLabel").pack(side="left", padx=(8, 0))

    # ------------------------------------------------------------------

    def _build_preview_panel(self, parent):
        # The outer wrapper must expand to fill remaining vertical space
        outer = ttk.Frame(parent, style="TFrame", padding=(0, 0, 0, 12))
        outer.pack(fill="both", expand=True)
        card = ttk.Frame(outer, style="Panel.TFrame", padding=(14, 12))
        card.pack(fill="both", expand=True)
        card.rowconfigure(1, weight=1)   # canvas row expands
        card.columnconfigure(0, weight=1)

        ttk.Label(card, text="🖼  Preview",
                  style="Section.TLabel").grid(row=0, column=0, sticky="w", pady=(0, 8))

        # Canvas — fills all available space; image is letterboxed inside it
        self.preview_canvas = tk.Canvas(
            card,
            bg=ENTRY_BG,
            highlightthickness=0,
            relief="flat",
        )
        self.preview_canvas.grid(row=1, column=0, sticky="nsew")

        # Placeholder text drawn on the canvas
        self._preview_placeholder_id = self.preview_canvas.create_text(
            0, 0,
            text="No preview",
            fill=TEXT_DIM,
            font=("Helvetica", 11),
            anchor="center",
            tags="placeholder",
        )
        self.preview_canvas.bind("<Configure>", self._on_preview_resize)

        self.preview_info_var = tk.StringVar(value="")
        ttk.Label(card, textvariable=self.preview_info_var,
                  style="Dim.TLabel").grid(row=2, column=0, sticky="w", pady=(4, 0))

        # ---- Size estimate row inside preview panel ----
        size_row = ttk.Frame(card, style="Panel.TFrame")
        size_row.grid(row=3, column=0, sticky="ew", pady=(6, 0))
        size_row.columnconfigure(1, weight=1)

        ttk.Label(size_row, text="Est. GIF size:",
                  style="Dim.TLabel").grid(row=0, column=0, sticky="w")

        self.est_size_preview_var = tk.StringVar(value="—")
        self.est_size_preview_lbl = tk.Label(
            size_row,
            textvariable=self.est_size_preview_var,
            bg=PANEL_BG, fg=TEXT_DIM,
            font=("Helvetica", 11, "bold"),
            anchor="w",
        )
        self.est_size_preview_lbl.grid(row=0, column=1, sticky="w", padx=(8, 0))

        self.est_range_var = tk.StringVar(value="")
        ttk.Label(card, textvariable=self.est_range_var,
                  style="Dim.TLabel").grid(row=4, column=0, sticky="w")

        # Internal state
        self._preview_pil_image: Image.Image | None = None   # full-res source frame
        self._preview_photo: ImageTk.PhotoImage | None = None  # current tk image
        self._preview_info_text: str = ""
        self._src_width:  int = 0
        self._src_height: int = 0

    # ------------------------------------------------------------------
    # File Scanning
    # ------------------------------------------------------------------

    def _scan_for_files(self):
        files = []
        for ext in SUPPORTED:
            files.extend(SCRIPT_DIR.glob(f"*{ext}"))
            files.extend(SCRIPT_DIR.glob(f"*{ext.upper()}"))
        # Exclude subdirectory contents
        files = [f for f in files if f.parent == SCRIPT_DIR]
        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        self.detected_files = files

        if not files:
            self.file_var.set("No movie files detected in this folder")
            self.file_info_var.set(f"Supported: {', '.join(sorted(SUPPORTED))}")
            self.file_list_frame.pack_forget()
            self.selected_file = None
            self.status_var.set("Waiting — drop a movie file into the gifConverter folder and click ⟳ Scan.")
            return

        if len(files) == 1:
            self.file_list_frame.pack_forget()
            self._select_file(files[0])
        else:
            self.file_var.set(f"{len(files)} files found — select one below:")
            self.file_info_var.set("")
            self.file_list_frame.pack(fill="x", pady=(6, 0))
            self.file_listbox.delete(0, "end")
            for f in files:
                self.file_listbox.insert("end", f.name)
            self.file_listbox.selection_set(0)
            self._select_file(files[0])

    def _on_file_select(self, event=None):
        sel = self.file_listbox.curselection()
        if sel:
            self._select_file(self.detected_files[sel[0]])

    def _select_file(self, path: Path):
        self.selected_file = path
        self.file_var.set(path.name)
        size_str = format_size(path.stat().st_size)

        # Get video info
        info = get_video_info(path)
        self.video_duration = info["duration"]
        dur_str = format_time(info["duration"])
        fps_str = f"{info['fps']:.1f}" if info["fps"] else "?"
        res_str = f"{info['width']}×{info['height']}" if info["width"] else "?"
        self.file_info_var.set(
            f"Duration: {dur_str}  |  Resolution: {res_str}  |  "
            f"FPS: {fps_str}  |  Size: {size_str}"
        )

        # Store source dimensions for the size estimator
        self._src_width  = info["width"]
        self._src_height = info["height"]

        # Update trim sliders
        dur = max(self.video_duration, 1.0)
        cap = min(dur, MAX_DURATION)
        self.trim_start_scale.configure(to=cap)
        self.trim_end_scale.configure(to=cap)
        self.trim_start_var.set(0.0)
        self.trim_end_var.set(min(cap, 10.0))
        self._on_trim_change()   # also calls _update_size_estimate

        # Suggest output name
        self.outname_var.set(path.stem)

        # Load preview
        self._load_preview(path, info["duration"])
        self.status_var.set(f"File selected: {path.name}  — configure settings and click Convert.")

    def _load_preview(self, path: Path, duration: float):
        def worker():
            ts = min(duration * 0.1, 2.0) if duration > 0 else 1.0
            img = extract_thumbnail(path, ts)
            if img:
                orig_w, orig_h = img.width, img.height
                info = f"Frame at {ts:.1f}s  |  {orig_w}×{orig_h}"
                self.root.after(0, lambda: self._set_preview(img, info))
            else:
                self.root.after(0, lambda: self._clear_preview("Preview unavailable"))
        threading.Thread(target=worker, daemon=True).start()

    def _set_preview(self, pil_img: Image.Image, info_text: str):
        """Store the source PIL image and trigger a canvas redraw."""
        self._preview_pil_image = pil_img
        self._preview_info_text = info_text
        self.preview_info_var.set(info_text)
        self._redraw_preview()

    def _clear_preview(self, message: str = "No preview"):
        """Remove any image and show a text placeholder."""
        self._preview_pil_image = None
        self._preview_photo = None
        self.preview_canvas.delete("preview_img")
        # Reposition placeholder text to canvas centre
        cw = self.preview_canvas.winfo_width()  or 200
        ch = self.preview_canvas.winfo_height() or 120
        self.preview_canvas.coords("placeholder", cw // 2, ch // 2)
        self.preview_canvas.itemconfigure("placeholder", text=message, state="normal")
        self.preview_info_var.set("")

    def _redraw_preview(self):
        """Scale the stored PIL image to fit the canvas while preserving aspect ratio."""
        if self._preview_pil_image is None:
            return

        cw = self.preview_canvas.winfo_width()
        ch = self.preview_canvas.winfo_height()
        if cw < 2 or ch < 2:
            # Canvas not yet realised — defer
            self.root.after(50, self._redraw_preview)
            return

        img = self._preview_pil_image
        iw, ih = img.width, img.height

        # Compute the largest size that fits inside (cw × ch) keeping aspect ratio
        scale = min(cw / iw, ch / ih)
        new_w = max(1, int(iw * scale))
        new_h = max(1, int(ih * scale))

        resized = img.resize((new_w, new_h), Image.LANCZOS)
        self._preview_photo = ImageTk.PhotoImage(resized)

        # Centre the image on the canvas
        cx, cy = cw // 2, ch // 2
        self.preview_canvas.delete("preview_img")
        self.preview_canvas.create_image(
            cx, cy,
            image=self._preview_photo,
            anchor="center",
            tags="preview_img",
        )
        # Hide placeholder text
        self.preview_canvas.itemconfigure("placeholder", state="hidden")

    def _on_preview_resize(self, event):
        """Called whenever the canvas is resized — redraws the image to fit."""
        if self._preview_pil_image is not None:
            self._redraw_preview()
        else:
            # Keep placeholder centred
            self.preview_canvas.coords(
                "placeholder", event.width // 2, event.height // 2
            )

    # ------------------------------------------------------------------
    # Live label updates
    # ------------------------------------------------------------------

    def _on_trim_change(self, *_):
        start = round(self.trim_start_var.get(), 1)
        end   = round(self.trim_end_var.get(), 1)
        if end <= start:
            end = start + 0.1
            self.trim_end_var.set(end)
        duration = round(end - start, 1)
        self.trim_start_lbl.configure(text=f"{start:.1f}s")
        self.trim_end_lbl.configure(text=f"{end:.1f}s")
        self.trim_duration_var.set(f"GIF duration: {duration:.1f}s")
        if duration > MAX_DURATION:
            self.trim_warn_var.set(f"⚠  Duration capped at {MAX_DURATION}s for safe output size.")
        else:
            self.trim_warn_var.set("")
        self._update_size_estimate()

    def _update_fps_label(self):
        v = int(self.fps_var.get())
        self.fps_lbl.configure(text=f"{v} fps")
        self._update_size_estimate()

    def _update_res_label(self):
        v = int(self.res_var.get())
        self.res_lbl.configure(text=f"{v} px")
        self._update_size_estimate()

    def _update_colours_label(self):
        v = int(self.colours_var.get())
        self.colours_lbl.configure(text=f"{v} colours")
        self._update_size_estimate()

    def _update_lossy_label(self):
        v = int(self.lossy_var.get())
        self.lossy_lbl.configure(text=str(v))
        self._update_size_estimate()

    def _update_size_estimate(self, *_):
        """Recalculate and display the estimated GIF file size."""
        if not getattr(self, 'selected_file', None):
            return

        start_t  = self.trim_start_var.get()
        end_t    = self.trim_end_var.get()
        duration = max(0.0, end_t - start_t)

        # Account for playback speed: faster speed = fewer frames in same wall time
        speed_map = {
            "0.25×": 0.25, "0.5×": 0.5, "0.75×": 0.75,
            "1×": 1.0, "1.25×": 1.25, "1.5×": 1.5,
            "2×": 2.0, "3×": 3.0, "4×": 4.0
        }
        speed    = speed_map.get(self.speed_combo.get(), 1.0)
        # At higher speed the clip plays faster — effective duration of source consumed
        # is the same, but the GIF output duration is duration/speed.
        # Frame count = fps * (duration / speed)  — fewer frames at higher speed.
        effective_duration = duration / speed if speed > 0 else duration

        fps      = max(1, int(self.fps_var.get()))
        width    = max(1, int(self.res_var.get()))
        colours  = max(8, int(self.colours_var.get()))
        lossy    = int(self.lossy_var.get())
        boomerang = self.boomerang_var.get()

        low, mid, high = estimate_gif_size(
            effective_duration, fps, width,
            self._src_height, self._src_width,
            colours, lossy, boomerang
        )

        if mid == 0:
            return

        col = size_colour(mid)
        mid_str  = format_size(mid)
        low_str  = format_size(low)
        high_str = format_size(high)
        range_str = f"Range: {low_str} – {high_str}  (estimate only)"

        # Tip text
        mb = mid / (1024 * 1024)
        if mb >= 8:
            tip = "⚠  Large file — try reducing width, fps, duration or increasing lossy"
        elif mb >= 2:
            tip = "Moderate size — good for most uses"
        else:
            tip = "✓  Small file"

        # Update preview panel labels
        self.est_size_preview_var.set(mid_str)
        self.est_size_preview_lbl.configure(fg=col)
        self.est_range_var.set(range_str)

        # Update bottom bar labels
        self.est_size_bar_var.set(mid_str)
        self.est_size_bar_lbl.configure(fg=col)
        self.est_tip_var.set(tip)

    # ------------------------------------------------------------------
    # Conversion
    # ------------------------------------------------------------------

    def _parse_speed(self) -> float:
        mapping = {
            "0.25×": 0.25, "0.5×": 0.5, "0.75×": 0.75,
            "1×": 1.0, "1.25×": 1.25, "1.5×": 1.5,
            "2×": 2.0, "3×": 3.0, "4×": 4.0
        }
        return mapping.get(self.speed_combo.get(), 1.0)

    def _parse_loop_count(self) -> int:
        """Return gifsicle loop count (0 = infinite)."""
        mapping = {
            "Infinite loop": 0,
            "Play once":     1,
            "2 loops":       2,
            "3 loops":       3,
            "5 loops":       5,
            "10 loops":      10,
        }
        return mapping.get(self.loop_var.get(), 0)

    def _start_conversion(self):
        if not self.selected_file or not self.selected_file.exists():
            messagebox.showerror("No File", "No source file selected. "
                                 "Drop a movie file into the gifConverter folder and click ⟳ Scan.")
            return

        # Gather settings
        start_t  = round(self.trim_start_var.get(), 2)
        end_t    = round(self.trim_end_var.get(), 2)
        duration = end_t - start_t

        if duration <= 0:
            messagebox.showerror("Invalid Trim", "End time must be greater than start time.")
            return
        if duration > MAX_DURATION:
            if not messagebox.askyesno("Long Duration",
                    f"The selected clip is {duration:.1f}s which may produce a very large GIF.\n"
                    f"Recommended maximum is {MAX_DURATION}s.\n\nContinue anyway?"):
                return

        fps      = max(MIN_FPS, min(MAX_FPS, int(self.fps_var.get())))
        speed    = self._parse_speed()
        width    = max(MIN_WIDTH, min(MAX_WIDTH, int(self.res_var.get())))
        colours  = max(8, min(MAX_COLOURS, int(self.colours_var.get())))
        loop     = self._parse_loop_count()
        dither   = self.dither_var.get()
        opt_lvl  = self.opt_var.get()
        lossy    = int(self.lossy_var.get())
        crop     = self.crop_var.get().strip()
        reverse  = self.reverse_var.get()
        boomerang= self.boomerang_var.get()
        out_stem = self.outname_var.get().strip() or self.selected_file.stem
        # Sanitise filename
        out_stem = "".join(c for c in out_stem if c.isalnum() or c in "-_ ")
        out_stem = out_stem.strip() or "output"

        # Unique output path
        out_path = GIFS_DIR / f"{out_stem}.gif"
        counter  = 1
        while out_path.exists():
            out_path = GIFS_DIR / f"{out_stem}_{counter}.gif"
            counter += 1

        self.convert_btn.configure(state="disabled")
        self.progress_var.set(0)
        self.status_var.set("Converting… please wait.")

        params = {
            "source":    self.selected_file,
            "out_path":  out_path,
            "start_t":   start_t,
            "duration":  duration,
            "fps":       fps,
            "speed":     speed,
            "width":     width,
            "colours":   colours,
            "loop":      loop,
            "dither":    dither,
            "opt_lvl":   opt_lvl,
            "lossy":     lossy,
            "crop":      crop,
            "reverse":   reverse,
            "boomerang": boomerang,
        }

        thread = threading.Thread(target=self._convert_worker, args=(params,), daemon=True)
        thread.start()

    # ------------------------------------------------------------------

    def _set_progress(self, pct: float, msg: str):
        self.root.after(0, lambda: self.progress_var.set(pct))
        self.root.after(0, lambda: self.status_var.set(msg))

    def _convert_worker(self, p: dict):
        source:    Path  = p["source"]
        out_path:  Path  = p["out_path"]
        start_t:   float = p["start_t"]
        duration:  float = p["duration"]
        fps:       int   = p["fps"]
        speed:     float = p["speed"]
        width:     int   = p["width"]
        colours:   int   = p["colours"]
        loop:      int   = p["loop"]
        dither:    str   = p["dither"]
        opt_lvl:   int   = p["opt_lvl"]
        lossy:     int   = p["lossy"]
        crop:      str   = p["crop"]
        reverse:   bool  = p["reverse"]
        boomerang: bool  = p["boomerang"]

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp = Path(tmpdir)
                raw_gif    = tmp / "raw.gif"
                palette    = tmp / "palette.png"
                frames_gif = tmp / "frames.gif"

                # ---- Step 1: Build ffmpeg video filter chain ----
                self._set_progress(5, "Step 1/4 — Generating colour palette…")

                vf_parts = []

                # Trim is handled via -ss / -t flags, not vf
                # Speed: setpts
                if speed != 1.0:
                    pts = round(1.0 / speed, 4)
                    vf_parts.append(f"setpts={pts}*PTS")

                # Crop
                if crop:
                    vf_parts.append(f"crop={crop}")

                # Scale (maintain aspect ratio)
                vf_parts.append(f"scale={width}:-2:flags=lanczos")

                # Reverse
                if reverse and not boomerang:
                    vf_parts.append("reverse")

                vf_base = ",".join(vf_parts)

                # ---- Palette generation ----
                palette_vf = f"{vf_base},palettegen=max_colors={colours}:stats_mode=diff"
                palette_cmd = [
                    "ffmpeg", "-y",
                    "-ss", str(start_t),
                    "-t",  str(duration),
                    "-i",  str(source),
                    "-vf", palette_vf,
                    "-frames:v", "1",
                    str(palette)
                ]
                result = subprocess.run(palette_cmd, capture_output=True, text=True, timeout=120)
                if result.returncode != 0 or not palette.exists():
                    raise RuntimeError(f"Palette generation failed:\n{result.stderr[-800:]}")

                # ---- Step 2: Render raw GIF ----
                self._set_progress(30, "Step 2/4 — Rendering GIF frames…")

                gif_vf = f"{vf_base} [x]; [x][1:v] paletteuse=dither={dither}:diff_mode=rectangle"
                gif_cmd = [
                    "ffmpeg", "-y",
                    "-ss", str(start_t),
                    "-t",  str(duration),
                    "-i",  str(source),
                    "-i",  str(palette),
                    "-lavfi", gif_vf,
                    "-r",  str(fps),
                    str(raw_gif)
                ]
                result = subprocess.run(gif_cmd, capture_output=True, text=True, timeout=300)
                if result.returncode != 0 or not raw_gif.exists():
                    raise RuntimeError(f"GIF rendering failed:\n{result.stderr[-800:]}")

                # ---- Step 3: Boomerang (append reversed copy) ----
                if boomerang:
                    self._set_progress(55, "Step 3/4 — Building boomerang…")
                    rev_gif   = tmp / "reversed.gif"
                    boom_gif  = tmp / "boomerang.gif"
                    rev_palette = tmp / "palette_rev.png"

                    # Build reversed video filter chain
                    rev_vf_parts = []
                    if speed != 1.0:
                        pts = round(1.0 / speed, 4)
                        rev_vf_parts.append(f"setpts={pts}*PTS")
                    if crop:
                        rev_vf_parts.append(f"crop={crop}")
                    rev_vf_parts.append(f"scale={width}:-2:flags=lanczos")
                    rev_vf_parts.append("reverse")  # reverse filter
                    rev_vf_base = ",".join(rev_vf_parts)

                    # Palette for reversed segment
                    subprocess.run([
                        "ffmpeg", "-y",
                        "-ss", str(start_t), "-t", str(duration),
                        "-i", str(source),
                        "-vf", f"{rev_vf_base},palettegen=max_colors={colours}:stats_mode=diff",
                        "-frames:v", "1", str(rev_palette)
                    ], capture_output=True, timeout=120)

                    # Render reversed GIF
                    if rev_palette.exists():
                        rev_gif_vf = (f"{rev_vf_base} [x]; "
                                      f"[x][1:v] paletteuse=dither={dither}:diff_mode=rectangle")
                        subprocess.run([
                            "ffmpeg", "-y",
                            "-ss", str(start_t), "-t", str(duration),
                            "-i", str(source),
                            "-i", str(rev_palette),
                            "-lavfi", rev_gif_vf,
                            "-r", str(fps),
                            str(rev_gif)
                        ], capture_output=True, timeout=300)

                    # Concatenate forward + reversed with gifsicle
                    if rev_gif.exists():
                        subprocess.run(
                            ["gifsicle", str(raw_gif), str(rev_gif), "-o", str(boom_gif)],
                            capture_output=True, timeout=120
                        )
                        if boom_gif.exists():
                            raw_gif = boom_gif

                # ---- Step 4: Optimise with gifsicle ----
                self._set_progress(70, "Step 4/4 — Optimising GIF…")

                loop_flag = "--loopcount=forever" if loop == 0 else f"--loopcount={loop}"
                if loop == 1:
                    loop_flag = "--no-loopcount"

                gifsicle_cmd = [
                    "gifsicle",
                    f"-O{opt_lvl}",
                    f"--lossy={lossy}",
                    loop_flag,
                    "--colors", str(colours),
                    str(raw_gif),
                    "-o", str(out_path)
                ]
                result = subprocess.run(gifsicle_cmd, capture_output=True, text=True, timeout=300)
                if result.returncode != 0:
                    # Fall back: just copy raw gif
                    shutil.copy2(raw_gif, out_path)

                if not out_path.exists() or out_path.stat().st_size == 0:
                    raise RuntimeError("Output GIF was not created or is empty.")

                # ---- Move original to Processed-Clips ----
                self._set_progress(95, "Archiving original file…")
                archive_dest = ARCHIVE_DIR / source.name
                counter = 1
                while archive_dest.exists():
                    archive_dest = ARCHIVE_DIR / f"{source.stem}_{counter}{source.suffix}"
                    counter += 1
                shutil.move(str(source), str(archive_dest))

            # ---- Done ----
            gif_size = format_size(out_path.stat().st_size)
            self._set_progress(100, f"Done!  →  {out_path.name}  ({gif_size})")
            self.root.after(0, lambda: self._on_conversion_done(out_path, gif_size))

        except Exception as exc:
            err_msg = str(exc)
            self.root.after(0, lambda: self._on_conversion_error(err_msg))

    # ------------------------------------------------------------------

    def _on_conversion_done(self, out_path: Path, size_str: str):
        self.convert_btn.configure(state="normal")
        self.progress_var.set(100)
        messagebox.showinfo(
            "Conversion Complete",
            f"GIF saved successfully!\n\n"
            f"File:  {out_path.name}\n"
            f"Size:  {size_str}\n"
            f"Path:  {out_path}\n\n"
            f"Original moved to:  Processed-Clips/"
        )
        # Re-scan for remaining files
        self._scan_for_files()

    def _on_conversion_error(self, msg: str):
        self.convert_btn.configure(state="normal")
        self.progress_var.set(0)
        self.status_var.set("Conversion failed — see error dialog.")
        messagebox.showerror("Conversion Failed", f"An error occurred:\n\n{msg}")

# ---------------------------------------------------------------------------
# Dependency check on startup
# ---------------------------------------------------------------------------

def check_dependencies():
    missing = []
    if not check_dependency("ffmpeg"):
        missing.append("ffmpeg  (install: sudo apt-get install ffmpeg  or  brew install ffmpeg)")
    if not check_dependency("ffprobe"):
        missing.append("ffprobe  (usually bundled with ffmpeg)")
    if not check_dependency("gifsicle"):
        missing.append("gifsicle  (install: sudo apt-get install gifsicle  or  brew install gifsicle)")
    return missing

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    # Ensure output folders exist
    GIFS_DIR.mkdir(exist_ok=True)
    ARCHIVE_DIR.mkdir(exist_ok=True)

    # Dependency check (non-blocking warning)
    missing = check_dependencies()
    if missing:
        root_tmp = tk.Tk()
        root_tmp.withdraw()
        messagebox.showwarning(
            "Missing Dependencies",
            "The following tools are required but were not found:\n\n" +
            "\n".join(f"  • {m}" for m in missing) +
            "\n\nPlease install them and restart the app."
        )
        root_tmp.destroy()
        if len(missing) >= 2:
            sys.exit(1)

    root = tk.Tk()
    root.geometry("900x780")

    # Centre on screen
    root.update_idletasks()
    w, h = 900, 780
    sw = root.winfo_screenwidth()
    sh = root.winfo_screenheight()
    root.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")

    app = GifConverterApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
