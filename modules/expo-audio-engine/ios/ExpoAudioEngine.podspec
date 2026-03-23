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
  
  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
