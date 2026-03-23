import AVFoundation
import ExpoModulesCore

public class ExpoAudioEngineModule: Module {
    private let player = AudioEnginePlayer()
    private let sessionManager = AudioSessionManager()
    private let nowPlayingService = NowPlayingService()
    private var currentTitle: String = ""
    private var currentArtist: String = ""

    public func definition() -> ModuleDefinition {
        Name("ExpoAudioEngine")

        Events("onStateChanged", "onFFTData", "onTrackCompleted", "onCommand")

        OnCreate {
            self.setupCallbacks()
            try? self.sessionManager.configure()
            self.nowPlayingService.setup()
        }

        // --- Audio Control ---

        AsyncFunction("load") { (filePath: String, title: String, artist: String) in
            self.currentTitle = title
            self.currentArtist = artist
            try self.player.load(filePath: filePath)
            self.player.play()
        }

        Function("pause") {
            self.player.pause()
        }

        Function("resume") {
            self.player.resume()
        }

        Function("stop") {
            self.player.stop()
            self.nowPlayingService.clearNowPlaying()
        }

        Function("seek") { (positionMs: Int) in
            self.player.seek(to: positionMs)
        }

        Function("setBandCount") { (count: Int) in
            self.player.setBandCount(count)
        }

        // --- State Queries (synchronous, cheap) ---

        Function("getPosition") { () -> Int in
            self.player.currentPositionMs()
        }

        Function("getIsPlaying") { () -> Bool in
            self.player.playbackState == .playing
        }

        // --- Metadata (uses AVAudioFile + AVAsset, async) ---

        AsyncFunction("getMetadata") { (filePath: String) -> [String: Any] in
            // Handle both file:// URIs and plain paths
            let url: URL
            if filePath.hasPrefix("file://") {
                guard let parsedURL = URL(string: filePath) else {
                    throw NSError(
                        domain: "ExpoAudioEngine", code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "Invalid file URI"])
                }
                url = parsedURL
            } else {
                url = URL(fileURLWithPath: filePath)
            }

            var durationMs: Int = 0
            if let audioFile = try? AVAudioFile(forReading: url) {
                let frames = audioFile.length
                let sampleRate = audioFile.processingFormat.sampleRate
                durationMs = Int(Double(frames) / sampleRate * 1000.0)
            }
            let asset = AVAsset(url: url)
            var title: String?
            var artist: String?
            for item in asset.commonMetadata {
                if item.commonKey == .commonKeyTitle {
                    title = item.stringValue
                } else if item.commonKey == .commonKeyArtist {
                    artist = item.stringValue
                }
            }
            if title == nil || title!.isEmpty {
                title = url.deletingPathExtension().lastPathComponent
            }
            return [
                "title": title ?? "Unknown",
                "artist": artist ?? "Unknown Artist",
                "durationMs": durationMs,
            ]
        }
    }

    private func setupCallbacks() {
        player.onStateChanged = { [weak self] state, positionMs, durationMs in
            guard let self = self else { return }
            self.sendEvent(
                "onStateChanged",
                [
                    "state": state,
                    "positionMs": positionMs,
                    "durationMs": durationMs,
                ])
            if !self.currentTitle.isEmpty {
                self.nowPlayingService.updateNowPlaying(
                    title: self.currentTitle,
                    artist: self.currentArtist,
                    durationSeconds: Double(durationMs) / 1000.0,
                    positionSeconds: Double(positionMs) / 1000.0,
                    isPlaying: state == "playing"
                )
            }
        }

        player.onFFTData = { [weak self] bands, nativeFftTimeUs in
            guard let self = self else { return }
            self.sendEvent(
                "onFFTData",
                [
                    "bands": bands,
                    "nativeFftTimeUs": nativeFftTimeUs,
                ])
        }

        player.onTrackCompleted = { [weak self] in
            self?.sendEvent("onTrackCompleted", [:])
        }

        sessionManager.onInterruption = { [weak self] began, shouldResume in
            guard let self = self else { return }
            if began {
                self.player.pause()
            } else if shouldResume {
                self.player.resume()
            }
        }

        nowPlayingService.onCommand = { [weak self] command in
            self?.sendEvent("onCommand", ["command": command])
        }

        nowPlayingService.onSeek = { [weak self] positionSeconds in
            let positionMs = Int(positionSeconds * 1000.0)
            self?.player.seek(to: positionMs)
        }
    }
}
