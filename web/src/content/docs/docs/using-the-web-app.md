---
title: 'Using the web app'
description: 'How rsv.repair loads files, runs the repair in your browser, and what each step means.'
---

## What you need

- A **reference video**: any clip from the **same Sony camera** that already plays (normal MP4/MOV-style file).
- Your **`.rsv` file**: the interrupted recording that will not open in a normal player.
- A **save location**: the tool writes a **fixed `.mp4`** (you choose the name and folder).
- A **supported browser** (recent **Chrome** or **Edge** is best) with **File System Access** so you can pick files and save output.

## 1. Load the tool

When you open **[rsv.repair](https://rsv.repair/)**, the repair engine loads in your browser. You may see **“Getting ready…”** for a moment while it prepares.

Use a recent **Chrome** or **Edge** so the tool can run as intended.

## 2. Choose files

**Working video (01)**  
Pick a **good recording from the same camera** as the `.rsv`. Same model and usual settings matter more than file name.

**Your `.rsv` (02)**  
The **`.rsv`** file that does not play. The file picker is limited to `.rsv` so you don’t accidentally pick the wrong type.

**Save as (03)**  
After both inputs are chosen, choose **where to save** the output **`.mp4`**. The browser asks for a path; nothing is uploaded to a server.

## 3. Start repair

Tap **Fix video**. You can open **Advanced options** (gear) before starting if you need non-default behavior (see below).

### Progress phases

The UI shows roughly where the job is:

- **Preparing…** Your files are opened and the job is starting.
- **Reading your working video…** The reference is being parsed.
- **Building your video…** The `.rsv` is being read and output is being written.
- **Finishing up…** The browser is flushing the last bytes to disk. **Large files can take minutes** here.

### Output log

Expand **Output log** to see detailed messages (same kind of information as the desktop tool’s console output).

### When it finishes

You should see **Done** and a short **preview** of the recovered video. The file is on disk at the path you chose.

## Optional: Advanced options

These map to the same flags as the **desktop Untrunc** tool. Most users leave everything **off**.

- **Skip unknown sequences:** If the parser hits unknown data, **keep going** instead of stopping. When enabled, **Step size** sets how many bytes to skip at a time (1–65536).
- **Stretch video** (**Experimental**): adjust video timing to match audio duration.
- **Keep unknown sequences:** **Include** unrecognized raw bytes in the output instead of discarding them.
- **Dynamic chunk stats:** Use **chunk pattern statistics** from the reference file for better recovery on some files.
- **Search for mdat:** **Brute-force** search for video data when the container structure is badly damaged (less common for pure `.rsv`).

## If repair won’t start

Try **refreshing** the page, then use **Chrome** or **Edge** on an up-to-date version.

## Privacy reminder

Processing is **local** in your browser: your reference clip, `.rsv`, and output are **not** sent to our servers as part of the repair flow. See [Privacy & your files](/docs/privacy/).
