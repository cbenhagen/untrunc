---
title: About Untrunc
description: The open-source repair engine behind rsv.repair, and the people who built it.
sidebar:
  order: 5
---

**rsv.repair** is powered by **[Untrunc](https://github.com/anthwlock/untrunc)**, an open-source tool that restores damaged or truncated MP4, M4V, MOV, and 3GP video files. Given a working reference video from the same camera, Untrunc can rebuild the container structure so the file plays again.

## The fork we use

The web app is built on a **[work-in-progress branch](https://github.com/cbenhagen/untrunc/tree/web)** that adds Sony `.rsv` recovery support and compiles Untrunc to run in the browser. That branch builds on the **[anthwlock/untrunc](https://github.com/anthwlock/untrunc)** fork, which itself improves on the **[original by ponchio](https://github.com/ponchio/untrunc)**.

## What anthwlock's fork improved

[anthwlock/untrunc](https://github.com/anthwlock/untrunc) brought major improvements over the original by ponchio:

- More than **10x faster**
- **Low memory usage**
- **>2 GB file support**
- Ability to **skip over unknown bytes**
- Generic support for all tracks with fixed-width chunks
- Can **stretch/shrink** video to match audio duration
- Compatible with **newer versions of FFmpeg**
- Handles **invalid atom lengths**
- Supports **GoPro** and **Sony XAVC** videos
- Many bug fixes

## What this branch adds

The [web branch](https://github.com/cbenhagen/untrunc/tree/web) builds on anthwlock's work and adds:

- **Sony RSV file recovery** (H.264 and H.265)
- **Browser-based** execution (compiled to run in your browser; no install needed)

## Credits

This project would not exist without the work of the open-source community:

- **[ponchio](https://github.com/ponchio)** created the original Untrunc.
- **[anthwlock](https://github.com/anthwlock)** rebuilt and maintained the improved fork that most people use today.
- **[cbenhagen](https://github.com/cbenhagen)** improved RSV recovery and implemented the browser port.
- **[FFmpeg](https://ffmpeg.org/)** provides the audio/video libraries that Untrunc depends on.

## Support the authors

If this software helped you, please consider donating to the people who wrote the repair engine.

- **anthwlock** (maintainer of the improved fork) · [Donate via PayPal](https://www.paypal.me/anthwlock)
- **ponchio** (original author) · [Donation instructions](https://github.com/ponchio/untrunc#helpsupport)
- **cbenhagen** (RSV recovery and browser port) · [Support on Ko-fi](https://ko-fi.com/ottomatic)
- **FFmpeg** (the A/V engine underneath) · [Donate to FFmpeg](https://www.ffmpeg.org/donations.html)

Thank you for supporting open-source software.

## Source code

- **Improved fork (upstream):** [github.com/anthwlock/untrunc](https://github.com/anthwlock/untrunc)
- **RSV + web branch:** [github.com/cbenhagen/untrunc/tree/web](https://github.com/cbenhagen/untrunc/tree/web)
- **Original:** [github.com/ponchio/untrunc](https://github.com/ponchio/untrunc)
- **License:** [GPL-2.0](https://github.com/anthwlock/untrunc/blob/master/COPYING)
