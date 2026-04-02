---
title: Spot .rsv files early
description: o/PARASHOOT as an extra check before you erase a card, and surfacing .RSV files alongside your normal backup workflow.
sidebar:
  order: 2
---

In professional workflows, media is typically offloaded to backup drives using dedicated tools (like Silverstack, OffShoot or ShotPut Pro). Once verified, the card needs to be cleared and returned to the camera team.

**[o/PARASHOOT](https://ottomatic.io/o/parashoot)** is a utility from OTTOMATIC that handles this critical final step. Rather than formatting the card in Disk Utility or handing it back to the ACs with footage still on it, o/PARASHOOT safely "erases" the card after import. It serves as a final safety net by automatically checking that the files on the card safely exist on your backup drives (verifying file names and sizes).

Once confirmed, it performs a **reversible "fake format"** by flipping bits in the card's partition table. This destroys the filesystem information in a controlled way so the computer and camera see it as "in need of formatting." If a card is ever accidentally erased, it can be easily restored in the app.

This provides two major workflow benefits on set:

1. **A foolproof signaling system**: By erasing the card with o/PARASHOOT before returning it to the camera, you signal to the ACs that it has been downloaded, checked, and is ready for reuse. If an AC inserts a card into the camera and does *not* get the initialize prompt, that card probably wasn't copied and should be checked immediately.
2. **In-camera formatting**: Every camera will force you to format a card erased with o/PARASHOOT before allowing it to be used for recording. This ensures that the card is always properly formatted in camera before each use, which is a best practice that prevents filesystem issues.

When you mount a card or run this clearing process, o/PARASHOOT can also **call out `.RSV` files** on the volume. This helps you **spot unfinished Sony recordings** before you clear the card.

OTTOMATIC documents behavior and **RSV** details in **[Sony .RSV files](https://help.ottomatic.io/en/articles/9410709-sony-rsv-files)**.

![Finder alert from o/PARASHOOT listing unfinished `.RSV` clips on the volume](../../../assets/parashoot-rsv-warning.png)
