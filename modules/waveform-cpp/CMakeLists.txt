cmake_minimum_required(VERSION 3.20)
project(WaveformPeaks
  VERSION 1.0.0
  DESCRIPTION "Shared C++ waveform peaks library for iOS (RN JSI + Flutter FFI)"
  LANGUAGES CXX C
)

# iOS-specific settings
set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "Build architecture for iOS")
set(CMAKE_OSX_SYSROOT iphoneos)
set(CMAKE_XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "15.1")
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Static library
add_library(WaveformPeaks STATIC
  src/waveform_peaks.cpp
)

target_include_directories(WaveformPeaks PUBLIC include)

# Accelerate.framework headers (vDSP) - link in Xcode/Pods
target_compile_options(WaveformPeaks PRIVATE -fPIC)

# Usage: 
# mkdir build && cd build
# cmake -DCMAKE_TOOLCHAIN_FILE=../ios.toolchain.cmake -DPLATFORM=OS64 ..
# cmake --build . --config Release
# → libWaveformPeaks.a
