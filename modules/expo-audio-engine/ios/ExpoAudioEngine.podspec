require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoAudioEngine'
  s.version        = package['version']
  s.summary        = 'Expo module for audio playback using AVAudioEngine with FFT'
  s.description    = 'Expo module wrapping AudioEnginePlayer for high-performance audio playback'
  s.license        = 'MIT'
  s.author         = ''
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { path: '.' }
  s.static_framework = true
  
  s.dependency 'ExpoModulesCore'
  
  # Source root is modules/expo-audio-engine/ios/ (the podspec directory).
  # CocoaPods PathList only enumerates files inside this root, so ../../ globs
  # in source_files are silently ignored. Instead, waveform_peaks.cpp is
  # #included directly inside WaveformCppBridge.mm (unity build) so it is
  # compiled as part of the .mm translation unit — no separate entry needed.
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    # Lets the compiler resolve #include "waveform_peaks.h" from anywhere inside the pod.
    'HEADER_SEARCH_PATHS' => '"${PODS_TARGET_SRCROOT}/../../waveform-cpp/include"'
  }
end
