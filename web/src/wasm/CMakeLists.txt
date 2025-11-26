cmake_minimum_required(VERSION 3.14)
project(untrunc-wasm)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Emscripten-specific settings
if(EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    
    # Compile flags
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s WASM=1")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ALLOW_MEMORY_GROWTH=1")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s INITIAL_MEMORY=256MB")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s MAXIMUM_MEMORY=4GB")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s MODULARIZE=1")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s EXPORT_NAME='createUntruncModule'")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ENVIRONMENT='web,worker'")
    
    # Embind for C++/JS interop
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --bind")
    
    # File system support
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s FORCE_FILESYSTEM=1")
    
    # Export runtime methods
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s EXPORTED_RUNTIME_METHODS=['FS','MEMFS','ccall','cwrap']")
    
    # Async support for streaming
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ASYNCIFY=1")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ASYNCIFY_STACK_SIZE=65536")
endif()

# Source directory
set(UNTRUNC_SRC_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../src")

# Collect source files
set(UNTRUNC_SOURCES
    ${UNTRUNC_SRC_DIR}/atom.cpp
    ${UNTRUNC_SRC_DIR}/codec.cpp
    ${UNTRUNC_SRC_DIR}/common.cpp
    ${UNTRUNC_SRC_DIR}/file.cpp
    ${UNTRUNC_SRC_DIR}/mp4.cpp
    ${UNTRUNC_SRC_DIR}/mutual_pattern.cpp
    ${UNTRUNC_SRC_DIR}/track.cpp
    ${UNTRUNC_SRC_DIR}/avc1/avc-config.cpp
    ${UNTRUNC_SRC_DIR}/avc1/avc1.cpp
    ${UNTRUNC_SRC_DIR}/avc1/nal.cpp
    ${UNTRUNC_SRC_DIR}/avc1/nal-slice.cpp
    ${UNTRUNC_SRC_DIR}/avc1/sps-info.cpp
    ${UNTRUNC_SRC_DIR}/hvc1/hvc1.cpp
    ${UNTRUNC_SRC_DIR}/hvc1/nal.cpp
    ${UNTRUNC_SRC_DIR}/hvc1/nal-slice.cpp
)

# WASM binding source
set(WASM_SOURCES
    untrunc_wasm.cpp
)

# Include directories
include_directories(
    ${UNTRUNC_SRC_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/ffmpeg/include
)

# Link directories
link_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/ffmpeg/lib
)

# Create executable
add_executable(untrunc ${UNTRUNC_SOURCES} ${WASM_SOURCES})

# Link FFmpeg libraries
target_link_libraries(untrunc
    avformat
    avcodec
    avutil
)

# Copy output to public directory
if(EMSCRIPTEN)
    add_custom_command(TARGET untrunc POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy
        ${CMAKE_BINARY_DIR}/untrunc.js
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../public/untrunc.js
        COMMAND ${CMAKE_COMMAND} -E copy
        ${CMAKE_BINARY_DIR}/untrunc.wasm
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../public/untrunc.wasm
    )
endif()

