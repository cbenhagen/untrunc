---
title: What is a .rsv file?
description: Sony RSV files appear when recording is interrupted. They usually still contain your video.
---

## Why you have a `.rsv` file

Sony cameras can write **`.rsv`** files when recording stops unexpectedly (for example **power loss**, **card removal**, or a **crash**). The name usually means the file is a reserved or incomplete recording.

## What’s inside

The file **still holds your video** (and usually audio). What’s missing is the usual **wrapper** (container) that tells normal players how to read it, so it won’t open like a regular MP4 or MOV even though the picture data is there.

## Check your camera for recovery options

**Before using any computer tool**, see whether your Sony body can recover unfinished clips **on the camera**. Some models are known to offer this:

- **VENICE**
- **FS6**
- **FS7**
- **A7S Mark III**

If yours supports it, try this first:

1. **Insert the memory card** back into the camera.
2. **Power on** and switch to **playback** mode.
3. If the camera **prompts you to recover** video files, follow the **on-screen instructions**.

Results vary by firmware and situation. If recovery isn’t offered or doesn’t work, you can still use **rsv.repair** with a **reference clip from the same camera** (see below).

:::tip[Using o/PARASHOOT?]
It can detect `.rsv` files on a card before you erase. [Learn more](/docs/spot-rsv-early/).
:::

## What you need to fix it

Recovery needs a **reference**: any **normal video from the same camera** (same model and typical settings). That clip teaches the repair process how your camera packed the data; then it can rebuild a standard file from your `.rsv`.

## Codec support

Recovery supports **H.264** and **H.265** streams as used on typical Sony bodies. Very old or unusual setups may need different tools.


