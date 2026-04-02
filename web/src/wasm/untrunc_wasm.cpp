/*
 * Untrunc WASM Bindings
 *
 * Emscripten embind exposes untrunc to JS. The link step does *not* use
 * Emscripten Asyncify (-s ASYNCIFY); streaming output uses EM_JS instead.
 *
 * When streaming writes are enabled, wasmWriteSync() calls into JS
 * (Module.writeSync). The worker implements writeSync by posting chunks to
 * the main thread and blocking with Atomics.wait() until the main thread
 * finishes FileSystemWritableFileStream.write(), giving real backpressure
 * without unwinding the WASM stack.
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <emscripten/emscripten.h>

#include <string>
#include <vector>
#include <sstream>
#include <functional>

// Include untrunc headers (paths are set via -I flag in build)
#include "mp4.h"
#include "atom.h"
#include "common.h"
#include "file.h"

using namespace emscripten;

// Global callbacks for progress, logging, and streaming I/O
val g_progress_callback = val::undefined();
val g_log_callback = val::undefined();
val g_read_callback = val::undefined();

// Flag to track if streaming write is enabled
static bool g_streaming_write_enabled = false;

// EM_JS for synchronous write using SharedArrayBuffer + Atomics
// This BLOCKS the worker thread until the write completes
EM_JS(void, wasmWriteSync, (const uint8_t* data, size_t size), {
    if (typeof Module.writeSync === 'function') {
        // Copy data to a regular array (will be copied to SharedArrayBuffer by JS)
        const copy = new Uint8Array(HEAPU8.subarray(data, data + size));
        // This function blocks using Atomics.wait() until write completes
        Module.writeSync(copy);
    }
});

// Synchronous write callback wrapper
void wasmWriteCallback(const uchar* data, size_t size) {
    if (g_streaming_write_enabled) {
        wasmWriteSync(data, size);
    }
}

// Bridge function for reads from JavaScript
size_t wasmReadCallback(off_t offset, uchar* buffer, size_t size) {
    if (!g_read_callback.isUndefined()) {
        // Call JS to read data - returns Uint8Array
        val result = g_read_callback((double)offset, (int)size);
        if (result.isUndefined() || result.isNull()) {
            return 0;
        }
        // Get length and copy data efficiently
        unsigned int length = result["length"].as<unsigned int>();
        if (length > size) length = size;
        
        // Use set() to copy from JS array to WASM memory view
        val destView = val(typed_memory_view(length, buffer));
        destView.call<void>("set", result);
        
        return length;
    }
    return 0;
}

// Override cout/cerr for logging
class WasmLogBuffer : public std::streambuf {
public:
    WasmLogBuffer(bool is_error) : is_error_(is_error) {}

protected:
    int overflow(int c) override {
        if (c != EOF) {
            buffer_ += static_cast<char>(c);
            if (c == '\n') {
                flush();
            }
        }
        return c;
    }

    int sync() override {
        flush();
        return 0;
    }

private:
    void flush() {
        if (!buffer_.empty()) {
            // Remove trailing newline for cleaner logs
            if (buffer_.back() == '\n') {
                buffer_.pop_back();
            }
            if (!buffer_.empty() && !g_log_callback.isUndefined()) {
                g_log_callback(buffer_);
            }
            buffer_.clear();
        }
    }

    std::string buffer_;
    bool is_error_;
};

static WasmLogBuffer cout_buffer(false);
static WasmLogBuffer cerr_buffer(true);
static std::streambuf* original_cout = nullptr;
static std::streambuf* original_cerr = nullptr;

void setupLogging() {
    original_cout = std::cout.rdbuf(&cout_buffer);
    original_cerr = std::cerr.rdbuf(&cerr_buffer);
}

void cleanupLogging() {
    if (original_cout) std::cout.rdbuf(original_cout);
    if (original_cerr) std::cerr.rdbuf(original_cerr);
}

// Progress callback wrapper
void wasmOnProgress(int percentage) {
    if (!g_progress_callback.isUndefined()) {
        g_progress_callback(percentage);
    }
}

void wasmOnStatus(const std::string& status) {
    if (!g_log_callback.isUndefined()) {
        g_log_callback(status);
    }
}

// Initialize untrunc
void initialize() {
    g_onProgress = wasmOnProgress;
    g_onStatus = wasmOnStatus;
    g_interactive = false;  // Disable interactive prompts
    g_is_gui = true;  // Enable GUI-style error handling (throw instead of exit)
    setupLogging();
}

// Set progress callback from JavaScript
void setProgressCallback(val callback) {
    g_progress_callback = callback;
}

// Set log callback from JavaScript
void setLogCallback(val callback) {
    g_log_callback = callback;
}

// Enable streaming write mode
void enableStreamingWrite() {
    g_streaming_write_enabled = true;
    FileWrite::s_write_callback = wasmWriteCallback;
}

// Disable streaming write mode
void disableStreamingWrite() {
    g_streaming_write_enabled = false;
    FileWrite::s_write_callback = nullptr;
}

// Flush any buffered stream data
void flushStreamBuffer() {
    if (!FileWrite::s_stream_buffer.empty() && g_streaming_write_enabled) {
        wasmWriteSync(FileWrite::s_stream_buffer.data(), FileWrite::s_stream_buffer.size());
        FileWrite::s_stream_buffer.clear();
    }
}

// Set read callback for streaming input
void setReadCallback(val callback, double fileSize) {
    g_read_callback = callback;
    if (!callback.isUndefined()) {
        FileRead::s_read_callback = wasmReadCallback;
        FileRead::s_read_file_size = (off_t)fileSize;
    } else {
        FileRead::s_read_callback = nullptr;
        FileRead::s_read_file_size = 0;
    }
}

// Clear read callback
void clearReadCallback() {
    g_read_callback = val::undefined();
    FileRead::s_read_callback = nullptr;
    FileRead::s_read_file_size = 0;
}

// Settings structure
struct RepairSettings {
    bool skipUnknown;
    int stepSize;
    bool stretchVideo;
    bool keepUnknown;
    bool useDynamicStats;
    bool searchMdat;
};

// Apply settings to global variables
void applySettings(const RepairSettings& settings) {
    g_ignore_unknown = settings.skipUnknown;
    if (settings.skipUnknown && settings.stepSize > 0) {
        Mp4::step_ = settings.stepSize;
    }
    g_stretch_video = settings.stretchVideo;
    g_dont_exclude = settings.keepUnknown;
    g_use_chunk_stats = settings.useDynamicStats;
    g_search_mdat = settings.searchMdat;
}

// Write a file to the virtual filesystem
bool writeFile(const std::string& path, const val& data) {
    std::vector<uint8_t> buffer = vecFromJSArray<uint8_t>(data);
    
    FILE* fp = fopen(path.c_str(), "wb");
    if (!fp) {
        return false;
    }
    
    size_t written = fwrite(buffer.data(), 1, buffer.size(), fp);
    fclose(fp);
    
    return written == buffer.size();
}

// Read a file from the virtual filesystem
val readFile(const std::string& path) {
    FILE* fp = fopen(path.c_str(), "rb");
    if (!fp) {
        return val::undefined();
    }
    
    fseek(fp, 0, SEEK_END);
    long size = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    
    std::vector<uint8_t> buffer(size);
    size_t read = fread(buffer.data(), 1, size, fp);
    fclose(fp);
    
    if (read != static_cast<size_t>(size)) {
        return val::undefined();
    }
    
    return val::array(buffer);
}

// Delete a file from the virtual filesystem
bool deleteFile(const std::string& path) {
    return remove(path.c_str()) == 0;
}

// Main repair function
struct RepairResult {
    bool success;
    std::string error;
    std::string outputPath;
};

RepairResult repair(
    const std::string& refPath,
    const std::string& brokenPath,
    const std::string& outputDir,
    const RepairSettings& settings
) {
    RepairResult result;
    result.success = false;
    
    try {
        applySettings(settings);
        
        Mp4 mp4;
        g_mp4 = &mp4;
        
        // Set output directory (must be writable, e.g., MEMFS)
        g_dst_path = outputDir;
        
        // Parse reference file
        logg(I, "parsing reference file: ", refPath, "\n");
        mp4.parseOk(refPath);
        
        // Check if file is RSV (Sony Recording in progress Video)
        std::string ext = brokenPath.substr(brokenPath.find_last_of('.') + 1);
        std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);
        if (ext == "rsv") {
            g_rsv_mode = true;
        }
        
        // Repair broken file
        logg(I, "repairing: ", brokenPath, "\n");
        mp4.repair(brokenPath);
        
        // Determine actual output path
        std::string baseName = brokenPath.substr(brokenPath.find_last_of('/') + 1);
        result.outputPath = outputDir + "/" + baseName + "_fixed.MP4";
        result.success = true;
        
    } catch (const std::exception& e) {
        result.error = e.what();
    } catch (const std::string& e) {
        result.error = e;
    } catch (const char* e) {
        result.error = e;
    } catch (...) {
        result.error = "Unknown error occurred";
    }
    
    // Clear output path
    g_dst_path.clear();
    
    return result;
}

// Cleanup function
void cleanup() {
    cleanupLogging();
}

// Emscripten bindings
EMSCRIPTEN_BINDINGS(untrunc) {
    value_object<RepairSettings>("RepairSettings")
        .field("skipUnknown", &RepairSettings::skipUnknown)
        .field("stepSize", &RepairSettings::stepSize)
        .field("stretchVideo", &RepairSettings::stretchVideo)
        .field("keepUnknown", &RepairSettings::keepUnknown)
        .field("useDynamicStats", &RepairSettings::useDynamicStats)
        .field("searchMdat", &RepairSettings::searchMdat);
    
    value_object<RepairResult>("RepairResult")
        .field("success", &RepairResult::success)
        .field("error", &RepairResult::error)
        .field("outputPath", &RepairResult::outputPath);
    
    function("initialize", &initialize);
    function("setProgressCallback", &setProgressCallback);
    function("setLogCallback", &setLogCallback);
    function("enableStreamingWrite", &enableStreamingWrite);
    function("disableStreamingWrite", &disableStreamingWrite);
    function("flushStreamBuffer", &flushStreamBuffer);
    function("setReadCallback", &setReadCallback);
    function("clearReadCallback", &clearReadCallback);
    function("writeFile", &writeFile);
    function("readFile", &readFile);
    function("deleteFile", &deleteFile);
    function("repair", &repair);
    function("cleanup", &cleanup);
}

