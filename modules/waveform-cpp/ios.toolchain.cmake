# iOS CMake Toolchain File
# Usage: cmake -DCMAKE_TOOLCHAIN_FILE=ios.toolchain.cmake -DPLATFORM=OS64 ..
# PLATFORM options: OS64 (device arm64), SIMULATORARM64 (sim arm64), SIMULATOR64 (sim x86_64)

cmake_minimum_required(VERSION 3.20)

# Determine platform
if(NOT DEFINED PLATFORM)
  set(PLATFORM "OS64")
endif()

# iOS SDK and deployment target
set(CMAKE_SYSTEM_NAME iOS)
set(CMAKE_OSX_DEPLOYMENT_TARGET "15.1")

if(PLATFORM STREQUAL "OS64")
  set(CMAKE_OSX_ARCHITECTURES "arm64")
  set(CMAKE_OSX_SYSROOT iphoneos)
  set(IOS_PLATFORM_LOCATION "iPhoneOS.platform")
elseif(PLATFORM STREQUAL "SIMULATORARM64")
  set(CMAKE_OSX_ARCHITECTURES "arm64")
  set(CMAKE_OSX_SYSROOT iphonesimulator)
  set(IOS_PLATFORM_LOCATION "iPhoneSimulator.platform")
elseif(PLATFORM STREQUAL "SIMULATOR64")
  set(CMAKE_OSX_ARCHITECTURES "x86_64")
  set(CMAKE_OSX_SYSROOT iphonesimulator)
  set(IOS_PLATFORM_LOCATION "iPhoneSimulator.platform")
endif()

# Force static lib (no dylib on iOS devices without signing)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build shared libraries" FORCE)

# Compiler flags
set(CMAKE_C_FLAGS_INIT   "-fembed-bitcode-marker")
set(CMAKE_CXX_FLAGS_INIT "-fembed-bitcode-marker")

# Skip compiler test (cross-compile)
set(CMAKE_C_COMPILER_WORKS   TRUE)
set(CMAKE_CXX_COMPILER_WORKS TRUE)

# Use Apple clang
set(CMAKE_C_COMPILER   "/usr/bin/clang")
set(CMAKE_CXX_COMPILER "/usr/bin/clang++")

# C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
