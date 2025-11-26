# Untrunc Web

A stunning web interface for [Untrunc](https://github.com/anthwlock/untrunc) - repair corrupted MP4, MOV, and M4V video files directly in your browser using WebAssembly.

## Features

- **100% Client-Side**: All processing happens in your browser - no file uploads to any server
- **Large File Support**: Streaming file processing handles videos of any size
- **Modern UI**: Beautiful dark theme with smooth animations
- **Advanced Settings**: Full access to untrunc's repair options
- **Real-time Progress**: Live logging and progress updates during repair
- **RSV Support**: Recover Sony RSV files from interrupted recordings

## Quick Start

### Development Mode

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building the WASM Module

The build script automatically compiles FFmpeg 7.1 and Untrunc to WebAssembly.

**Prerequisites:**
- Emscripten SDK (install via `brew install emscripten` on macOS)

```bash
# Build the WASM module
cd web/src/wasm
./build.sh
```

The build script will:
1. Download and compile FFmpeg 7.1 for WebAssembly (~5 minutes)
2. Compile Untrunc with Emscripten
3. Output `untrunc.js` (91KB) and `untrunc.wasm` (1.8MB) to `public/`

### Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── components/         # React UI components
│   │   ├── FileDropZone.tsx    # Drag-and-drop file upload
│   │   ├── RepairProgress.tsx  # Progress visualization
│   │   ├── SettingsPanel.tsx   # Advanced settings
│   │   ├── LogOutput.tsx       # Real-time log display
│   │   ├── Header.tsx          # App header
│   │   └── ErrorBoundary.tsx   # Error handling
│   ├── hooks/              # React hooks
│   │   ├── useUntrunc.ts       # Main repair hook
│   │   └── useFileStream.ts    # Streaming file utilities
│   ├── workers/            # Web Workers
│   │   └── repair.worker.ts    # Background repair process
│   ├── wasm/               # WASM build files
│   │   ├── untrunc_wasm.cpp    # C++/JS bindings
│   │   ├── CMakeLists.txt      # Build configuration
│   │   └── build.sh            # Build script
│   ├── lib/                # Utility libraries
│   │   └── ffmpeg-types.ts     # FFmpeg type definitions
│   ├── App.tsx             # Main application
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
└── public/
    ├── untrunc.js          # WASM loader (after build)
    ├── untrunc.wasm        # WASM binary (after build)
    └── favicon.svg
```

## How It Works

1. **File Selection**: Users drag-and-drop or browse to select:
   - A **reference video**: A working video from the same camera
   - A **broken video**: The corrupted file to repair

2. **Processing**: When repair starts:
   - Files are loaded into browser memory
   - A Web Worker initializes the WASM module
   - Files are written to a virtual filesystem
   - Untrunc analyzes and repairs the video
   - Progress and logs are streamed back to the UI

3. **Output**: The repaired video is:
   - Read from the virtual filesystem
   - Offered as a download
   - Can be previewed in the browser

## Technology Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Framer Motion** for animations
- **Emscripten** for C++ to WebAssembly compilation
- **FFmpeg** (WASM build) for video codec support
- **Web Workers** for background processing
- **File System Access API** for streaming large files

## Browser Requirements

- Modern browsers with WebAssembly support
- SharedArrayBuffer support (requires COOP/COEP headers)
- Recommended: Chrome/Edge for best File System Access API support

## Simulation Mode

If the WASM module is not built, the app runs in "simulation mode" which demonstrates the UI flow without actually repairing videos. Build the WASM module for full functionality.

## License

GPL-2.0 - Same as the original Untrunc project
