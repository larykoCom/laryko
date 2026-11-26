import UIKit
import Capacitor
import AudioToolbox
import AVFoundation
import UserNotifications
import WebKit

// ============================================================
// NativeIOSBridge – Puente Nativo Swift para Liquid Glass y Hápticos
// ============================================================
@objc(NativeIOSBridge)
public class NativeIOSBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeIOSBridge"
    public let jsName = "NativeIOSBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "triggerHaptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLiquidGlassCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWebViewTransparent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copyToClipboardWithHaptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBadge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setActiveTab", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTabBarVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestNotificationPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendNativeNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleNativeNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelNativeNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startNativeAlarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopNativeAlarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playNativeNotificationSound", returnType: CAPPluginReturnPromise)
    ]

    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let selectionFeedback = UISelectionFeedbackGenerator()
    private let notificationFeedback = UINotificationFeedbackGenerator()
    private var alarmPlayer: AVAudioPlayer?
    private var notifyPlayer: AVAudioPlayer?
    private let notificationDelegate = LarykoNotificationDelegate()

    override public func load() {
        super.load()
        UNUserNotificationCenter.current().delegate = notificationDelegate
        DispatchQueue.main.async { [weak self] in
            self?.lightImpact.prepare()
            self?.mediumImpact.prepare()
            self?.heavyImpact.prepare()
            self?.selectionFeedback.prepare()
            self?.notificationFeedback.prepare()
        }
    }

    @objc func triggerHaptic(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "light"

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.resolve()
                return
            }

            switch type {
            case "selection":
                self.selectionFeedback.selectionChanged()
                self.selectionFeedback.prepare()
            case "medium":
                self.mediumImpact.impactOccurred()
                self.mediumImpact.prepare()
            case "heavy":
                self.heavyImpact.impactOccurred()
                self.heavyImpact.prepare()
            case "success":
                self.notificationFeedback.notificationOccurred(.success)
            case "warning":
                self.notificationFeedback.notificationOccurred(.warning)
            case "error":
                self.notificationFeedback.notificationOccurred(.error)
            case "light":
                fallthrough
            default:
                self.lightImpact.impactOccurred()
                self.lightImpact.prepare()
            }
            call.resolve()
        }
    }

    @objc func getLiquidGlassCapabilities(_ call: CAPPluginCall) {
        let systemVersion = UIDevice.current.systemVersion
        let majorVersion = Int(systemVersion.split(separator: ".").first ?? "0") ?? 0
        let hasNativeLiquidGlass = majorVersion >= 18

        call.resolve([
            "hasNativeLiquidGlass": hasNativeLiquidGlass,
            "supportsHaptics": true,
            "systemVersion": systemVersion,
            "model": UIDevice.current.model,
            "isiOS": true,
            "bridgeVersion": "1.1.1"
        ])
    }

    @objc func setWebViewTransparent(_ call: CAPPluginCall) {
        let transparent = call.getBool("transparent") ?? true

        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView else {
                call.resolve(["success": false])
                return
            }

            if transparent {
                webView.isOpaque = false
                webView.backgroundColor = .clear
                webView.scrollView.backgroundColor = .clear
            } else {
                webView.isOpaque = true
                webView.backgroundColor = .systemBackground
                webView.scrollView.backgroundColor = .systemBackground
            }
            call.resolve(["success": true])
        }
    }

    @objc func copyToClipboardWithHaptic(_ call: CAPPluginCall) {
        guard let text = call.getString("text") else {
            call.reject("Texto requerido")
            return
        }

        DispatchQueue.main.async { [weak self] in
            UIPasteboard.general.string = text
            self?.notificationFeedback.notificationOccurred(.success)
            call.resolve(["success": true])
        }
    }

    @objc func setBadge(_ call: CAPPluginCall) {
        let count = call.getInt("count") ?? 0
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = count
            call.resolve(["success": true])
        }
    }

    @objc func setActiveTab(_ call: CAPPluginCall) {
        guard let tab = call.getString("tab") else {
            call.reject("Tab requerido")
            return
        }
        DispatchQueue.main.async {
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let window = windowScene.windows.first(where: { $0.isKeyWindow }),
               let rootVC = window.rootViewController as? LarykoRootViewController {
                rootVC.updateNativeTab(tab: tab)
            }
            call.resolve(["success": true])
        }
    }

    @objc func setTabBarVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? true
        DispatchQueue.main.async {
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let window = windowScene.windows.first(where: { $0.isKeyWindow }),
               let rootVC = window.rootViewController as? LarykoRootViewController {
                rootVC.setNativeTabBarVisible(visible)
            }
            call.resolve(["success": true])
        }
    }

    @objc func requestNotificationPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            call.resolve(["granted": granted])
        }
    }

    @objc func sendNativeNotification(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "Laryko"
        let body = call.getString("body") ?? ""
        let isAlarm = call.getBool("isAlarm") ?? false
        let id = call.getString("id") ?? UUID().uuidString

        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else {
                call.resolve(["success": false])
                return
            }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            if #available(iOS 15.0, *), isAlarm {
                content.interruptionLevel = .timeSensitive
            }
            let request = UNNotificationRequest(identifier: id, content: content, trigger: nil)
            center.add(request) { err in
                call.resolve(["success": err == nil])
            }
        }
    }

    @objc func scheduleNativeNotification(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.resolve(["success": false])
            return
        }
        let title = call.getString("title") ?? "Laryko"
        let body = call.getString("body") ?? ""
        let isAlarm = call.getBool("isAlarm") ?? false
        let triggerAtMs = call.getDouble("triggerAtMs") ?? 0
        let intervalSec = max(1.0, (triggerAtMs - Date().timeIntervalSince1970 * 1000.0) / 1000.0)

        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else {
                call.resolve(["success": false])
                return
            }
            center.removePendingNotificationRequests(withIdentifiers: [id])
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            if #available(iOS 15.0, *), isAlarm {
                content.interruptionLevel = .timeSensitive
            }
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: intervalSec, repeats: false)
            let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
            center.add(request) { err in
                call.resolve(["success": err == nil])
            }
        }
    }

    @objc func cancelNativeNotification(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.resolve(["success": false])
            return
        }
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [id])
        center.removeDeliveredNotifications(withIdentifiers: [id])
        call.resolve(["success": true])
    }

    @objc func startNativeAlarm(_ call: CAPPluginCall) {
        let volumePercent = call.getDouble("volume") ?? 100.0
        let vol = Float(min(1.0, max(0.0, volumePercent / 100.0)))
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.resolve(["success": false])
                return
            }
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playback, mode: .default, options: [.duckOthers])
                try session.setActive(true)
                let wavData = Self.buildToneWav(isAlarm: true)
                let player = try AVAudioPlayer(data: wavData)
                player.numberOfLoops = -1
                player.volume = vol
                player.prepareToPlay()
                player.play()
                self.alarmPlayer?.stop()
                self.alarmPlayer = player
                AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
                call.resolve(["success": true])
            } catch {
                call.resolve(["success": false])
            }
        }
    }

    @objc func stopNativeAlarm(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.alarmPlayer?.stop()
            self?.alarmPlayer = nil
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            call.resolve(["success": true])
        }
    }

    @objc func playNativeNotificationSound(_ call: CAPPluginCall) {
        let volumePercent = call.getDouble("volume") ?? 80.0
        let vol = Float(min(1.0, max(0.0, volumePercent / 100.0)))
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.resolve(["success": false])
                return
            }
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
                try session.setActive(true)
                let wavData = Self.buildToneWav(isAlarm: false)
                let player = try AVAudioPlayer(data: wavData)
                player.numberOfLoops = 0
                player.volume = vol
                player.prepareToPlay()
                player.play()
                self.notifyPlayer = player
                call.resolve(["success": true])
            } catch {
                call.resolve(["success": false])
            }
        }
    }

    private static func buildToneWav(isAlarm: Bool) -> Data {
        let sampleRate = 22050
        let durationSec = isAlarm ? 1.0 : 0.45
        let numSamples = Int(Double(sampleRate) * durationSec)
        var pcm = Data(capacity: numSamples * 2)

        for i in 0..<numSamples {
            let t = Double(i) / Double(sampleRate)
            var sample: Double = 0
            if isAlarm {
                // Doble pulso de alarma agudo y claro (880 Hz / 1175 Hz)
                let phase = t.truncatingRemainder(dividingBy: 0.5)
                if phase < 0.22 {
                    let freq = t < 0.5 ? 880.0 : 1174.66
                    let env = min(1.0, phase / 0.01) * min(1.0, (0.22 - phase) / 0.02)
                    sample = sin(2.0 * Double.pi * freq * t) * 0.85 * env
                }
            } else {
                let freq = t < 0.16 ? 587.33 : 880.0
                let env = min(1.0, t / 0.015) * max(0.0, 1.0 - (t / durationSec))
                sample = sin(2.0 * Double.pi * freq * t) * 0.65 * env
            }
            let intSample = Int16(max(-32767, min(32767, sample * 32767.0)))
            var le = intSample.littleEndian
            pcm.append(Data(bytes: &le, count: 2))
        }

        let dataSize = UInt32(pcm.count)
        let chunkSize = UInt32(36 + pcm.count)
        var wav = Data()
        wav.append("RIFF".data(using: .ascii)!)
        var cs = chunkSize.littleEndian
        wav.append(Data(bytes: &cs, count: 4))
        wav.append("WAVEfmt ".data(using: .ascii)!)
        var fmtSize = UInt32(16).littleEndian
        wav.append(Data(bytes: &fmtSize, count: 4))
        var audioFormat = UInt16(1).littleEndian
        wav.append(Data(bytes: &audioFormat, count: 2))
        var channels = UInt16(1).littleEndian
        wav.append(Data(bytes: &channels, count: 2))
        var sr = UInt32(sampleRate).littleEndian
        wav.append(Data(bytes: &sr, count: 4))
        var byteRate = UInt32(sampleRate * 2).littleEndian
        wav.append(Data(bytes: &byteRate, count: 4))
        var blockAlign = UInt16(2).littleEndian
        wav.append(Data(bytes: &blockAlign, count: 2))
        var bitsPerSample = UInt16(16).littleEndian
        wav.append(Data(bytes: &bitsPerSample, count: 2))
        wav.append("data".data(using: .ascii)!)
        var ds = dataSize.littleEndian
        wav.append(Data(bytes: &ds, count: 4))
        wav.append(pcm)
        return wav
    }
}

private class LarykoNotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge, .list])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }
}

// ============================================================
// MultiSessionPlugin – Contenedores WKWebView aislados en iOS
// ============================================================
@objc(MultiSessionPlugin)
public class MultiSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MultiSessionPlugin"
    public let jsName = "MultiSessionPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sleepSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sleepAllSessions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteSessionData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getActiveSessions", returnType: CAPPluginReturnPromise)
    ]

    private var activeControllers: [String: SessionWebViewController] = [:]

    private func rootController() -> LarykoRootViewController? {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first(where: { $0.isKeyWindow }),
           let rootVC = window.rootViewController as? LarykoRootViewController {
            return rootVC
        }
        return nil
    }

    @objc func openSession(_ call: CAPPluginCall) {
        guard let uuidStr = call.getString("uuid"),
              let urlStr = call.getString("url"),
              let url = URL(string: urlStr),
              url.scheme == "https" || url.scheme == "http" else {
            call.resolve(["success": false])
            return
        }
        let title = call.getString("title") ?? "Sesión"

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.resolve(["success": false])
                return
            }

            if let existing = self.activeControllers[uuidStr] {
                if let rootVC = self.rootController() {
                    rootVC.showEmbeddedSession(existing)
                }
                call.resolve(["success": true])
                return
            }

            let vc = SessionWebViewController(sessionUuid: uuidStr, sessionTitle: title, initialUrl: url)
            vc.onSleep = { [weak self] id in
                self?.activeControllers.removeValue(forKey: id)
                self?.rootController()?.hideEmbeddedSession(id)
            }
            vc.onMinimize = { [weak self] _ in
                self?.rootController()?.minimizeEmbeddedSession()
            }
            self.activeControllers[uuidStr] = vc

            if let rootVC = self.rootController() {
                rootVC.showEmbeddedSession(vc)
                call.resolve(["success": true])
            } else if let presenter = self.bridge?.viewController {
                vc.modalPresentationStyle = .fullScreen
                presenter.present(vc, animated: true) {
                    call.resolve(["success": true])
                }
            } else {
                call.resolve(["success": false])
            }
        }
    }

    @objc func sleepSession(_ call: CAPPluginCall) {
        let uuidStr = call.getString("uuid") ?? ""
        DispatchQueue.main.async { [weak self] in
            if let vc = self?.activeControllers.removeValue(forKey: uuidStr) {
                vc.destroyAndDismiss()
            }
            call.resolve(["success": true])
        }
    }

    @objc func sleepAllSessions(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.resolve(["success": true])
                return
            }
            for (_, vc) in self.activeControllers {
                vc.destroyAndDismiss()
            }
            self.activeControllers.removeAll()
            call.resolve(["success": true])
        }
    }

    @objc func deleteSessionData(_ call: CAPPluginCall) {
        let uuidStr = call.getString("uuid") ?? ""
        DispatchQueue.main.async { [weak self] in
            if let vc = self?.activeControllers.removeValue(forKey: uuidStr) {
                vc.destroyAndDismiss()
            }
            if #available(iOS 17.0, *), let uuid = UUID(uuidString: uuidStr) {
                WKWebsiteDataStore.remove(forIdentifier: uuid) { _ in
                    call.resolve(["success": true])
                }
            } else {
                call.resolve(["success": true])
            }
        }
    }

    @objc func getActiveSessions(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            let uuids = Array(self?.activeControllers.keys ?? [:].keys)
            call.resolve(["uuids": uuids])
        }
    }
}

class SessionWebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private let sessionUuid: String
    private let sessionTitle: String
    private let initialUrl: URL
    private var sessionWebView: WKWebView?
    private let spinner = UIActivityIndicatorView(style: .medium)
    var onSleep: ((String) -> Void)?
    var onMinimize: ((String) -> Void)?

    init(sessionUuid: String, sessionTitle: String, initialUrl: URL) {
        self.sessionUuid = sessionUuid
        self.sessionTitle = sessionTitle
        self.initialUrl = initialUrl
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) not supported")
    }

    private func isDesktopOnlyHost(_ host: String?) -> Bool {
        guard let h = host?.lowercased() else { return false }
        return h.contains("whatsapp.com") || h.contains("discord.com") || h.contains("slack.com") || h.contains("notion.so")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let desktopOnly = isDesktopOnlyHost(initialUrl.host)
        if desktopOnly {
            config.defaultWebpagePreferences.preferredContentMode = .desktop
            let desktopSpoof = """
            try {
              Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
              Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
            } catch (e) {}
            """
            config.userContentController.addUserScript(
                WKUserScript(source: desktopSpoof, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            )
            let autoContinueWhatsApp = """
            (function() {
              var tries = 0;
              var timer = setInterval(function() {
                tries++;
                var btns = document.querySelectorAll('a, button');
                for (var i = 0; i < btns.length; i++) {
                  var txt = (btns[i].textContent || '').toLowerCase();
                  if (txt.indexOf('continuar en whatsapp web') !== -1 || txt.indexOf('continue to whatsapp web') !== -1) {
                    btns[i].click();
                    clearInterval(timer);
                    return;
                  }
                }
                if (tries > 20) clearInterval(timer);
              }, 300);
            })();
            """
            config.userContentController.addUserScript(
                WKUserScript(source: autoContinueWhatsApp, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
            )
        }

        if #available(iOS 17.0, *), let uuid = UUID(uuidString: sessionUuid) {
            config.websiteDataStore = WKWebsiteDataStore(forIdentifier: uuid)
        } else {
            config.websiteDataStore = .default()
        }

        let wv = WKWebView(frame: .zero, configuration: config)
        wv.translatesAutoresizingMaskIntoConstraints = false
        wv.allowsBackForwardNavigationGestures = true
        wv.navigationDelegate = self
        wv.uiDelegate = self
        wv.isOpaque = true
        wv.backgroundColor = .systemBackground

        if desktopOnly {
            wv.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15"
        } else {
            wv.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1"
        }

        self.sessionWebView = wv

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.hidesWhenStopped = true

        view.addSubview(wv)
        view.addSubview(spinner)

        NSLayoutConstraint.activate([
            wv.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            wv.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            wv.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            wv.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            spinner.centerXAnchor.constraint(equalTo: wv.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: wv.centerYAnchor)
        ])

        spinner.startAnimating()
        wv.load(URLRequest(url: initialUrl))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        spinner.stopAnimating()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        spinner.stopAnimating()
        showLoadErrorIfNeeded(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        spinner.stopAnimating()
        showLoadErrorIfNeeded(error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    private func showLoadErrorIfNeeded(_ error: Error) {
        let nsErr = error as NSError
        if nsErr.domain == NSURLErrorDomain && nsErr.code == NSURLErrorCancelled {
            return
        }
        let alert = UIAlertController(
            title: "No se pudo cargar \(sessionTitle)",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Reintentar", style: .default) { [weak self] _ in
            self?.spinner.startAnimating()
            self?.sessionWebView?.reload()
        })
        alert.addAction(UIAlertAction(title: "Cerrar", style: .cancel))
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            if url.scheme == "http" || url.scheme == "https" {
                webView.load(navigationAction.request)
            }
        }
        return nil
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        let scheme = url.scheme?.lowercased() ?? ""
        if scheme == "http" || scheme == "https" || scheme == "about" || scheme == "blob" || scheme == "data" {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
        }
    }

    func goBack() {
        if sessionWebView?.canGoBack == true {
            sessionWebView?.goBack()
        }
    }

    func reloadPage() {
        sessionWebView?.reload()
    }

    func destroyAndDismiss() {
        sessionWebView?.stopLoading()
        sessionWebView?.removeFromSuperview()
        sessionWebView = nil
        onSleep?(sessionUuid)
        if presentingViewController != nil {
            dismiss(animated: true)
        }
    }
}

// ============================================================
// MainViewController – Controlador Capacitor (sin subviews intrusivas)
// ============================================================
class MainViewController: CAPBridgeViewController {
    override open func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
    }

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeIOSBridge())
        bridge?.registerPluginInstance(MultiSessionPlugin())
        webView?.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
        webView?.scrollView.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }
}

// ============================================================
// LarykoRootViewController – Contenedor raíz con Liquid Glass UITabBar Nativo
// ============================================================
class LarykoRootViewController: UIViewController, UITabBarDelegate {
    let bridgeVC = MainViewController()
    private let nativeTabBar = UITabBar()
    private var embeddedSessionVC: SessionWebViewController?
    private var homeTabItem: UITabBarItem!
    private var calcTabItem: UITabBarItem!
    private var sessionsTabItem: UITabBarItem!
    private var remindersTabItem: UITabBarItem!
    private var sessionBackItem: UITabBarItem!
    private var sessionReloadItem: UITabBarItem!
    private var sessionListItem: UITabBarItem!
    private var sessionSleepItem: UITabBarItem!
    private var sessionHomeItem: UITabBarItem!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)

        addChild(bridgeVC)
        bridgeVC.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bridgeVC.view)
        NSLayoutConstraint.activate([
            bridgeVC.view.topAnchor.constraint(equalTo: view.topAnchor),
            bridgeVC.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bridgeVC.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bridgeVC.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        bridgeVC.didMove(toParent: self)

        setupNativeTabBar()
        setNativeTabBarVisible(true)
    }

    private func setupNativeTabBar() {
        nativeTabBar.delegate = self
        nativeTabBar.translatesAutoresizingMaskIntoConstraints = false
        nativeTabBar.isTranslucent = true

        if #unavailable(iOS 26.0) {
            let appearance = UITabBarAppearance()
            appearance.configureWithDefaultBackground()
            appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterial)
            nativeTabBar.standardAppearance = appearance
            if #available(iOS 15.0, *) {
                nativeTabBar.scrollEdgeAppearance = appearance
            }
        }

        // Ítems con SF Symbols nativos de Apple
        homeTabItem = UITabBarItem(
            title: "Inicio",
            image: UIImage(systemName: "house"),
            selectedImage: UIImage(systemName: "house.fill")
        )
        homeTabItem.tag = 0

        calcTabItem = UITabBarItem(
            title: "Calculadora",
            image: UIImage(systemName: "plus.forwardslash.minus"),
            selectedImage: UIImage(systemName: "plus.forwardslash.minus.circle.fill")
        )
        calcTabItem.tag = 1

        sessionsTabItem = UITabBarItem(
            title: "Sesiones",
            image: UIImage(systemName: "square.stack.3d.up"),
            selectedImage: UIImage(systemName: "square.stack.3d.up.fill")
        )
        sessionsTabItem.tag = 2

        remindersTabItem = UITabBarItem(
            title: "Agenda",
            image: UIImage(systemName: "bell"),
            selectedImage: UIImage(systemName: "bell.fill")
        )
        remindersTabItem.tag = 3

        sessionBackItem = UITabBarItem(
            title: "Atrás",
            image: UIImage(systemName: "chevron.left"),
            selectedImage: UIImage(systemName: "chevron.left")
        )
        sessionBackItem.tag = 10

        sessionReloadItem = UITabBarItem(
            title: "Recargar",
            image: UIImage(systemName: "arrow.clockwise"),
            selectedImage: UIImage(systemName: "arrow.clockwise")
        )
        sessionReloadItem.tag = 11

        sessionListItem = UITabBarItem(
            title: "Sesiones",
            image: UIImage(systemName: "square.stack.3d.up"),
            selectedImage: UIImage(systemName: "square.stack.3d.up.fill")
        )
        sessionListItem.tag = 12

        sessionSleepItem = UITabBarItem(
            title: "Dormir",
            image: UIImage(systemName: "moon.zzz"),
            selectedImage: UIImage(systemName: "moon.zzz.fill")
        )
        sessionSleepItem.tag = 13

        sessionHomeItem = UITabBarItem(
            title: "Inicio",
            image: UIImage(systemName: "house"),
            selectedImage: UIImage(systemName: "house.fill")
        )
        sessionHomeItem.tag = 14

        nativeTabBar.items = [homeTabItem, calcTabItem, sessionsTabItem, remindersTabItem]
        nativeTabBar.selectedItem = homeTabItem

        view.addSubview(nativeTabBar)

        NSLayoutConstraint.activate([
            nativeTabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            nativeTabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            nativeTabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    private func setSessionBarMode(_ active: Bool, selectTab: String? = nil) {
        if active {
            nativeTabBar.setItems(
                [sessionBackItem, sessionReloadItem, sessionListItem, sessionSleepItem, sessionHomeItem],
                animated: true
            )
            nativeTabBar.selectedItem = sessionListItem
        } else {
            nativeTabBar.setItems(
                [homeTabItem, calcTabItem, sessionsTabItem, remindersTabItem],
                animated: true
            )
            if let tab = selectTab {
                updateNativeTab(tab: tab)
            }
        }
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        switch item.tag {
        case 10:
            embeddedSessionVC?.goBack()
            nativeTabBar.selectedItem = sessionListItem
            return
        case 11:
            embeddedSessionVC?.reloadPage()
            nativeTabBar.selectedItem = sessionListItem
            return
        case 12:
            minimizeEmbeddedSession()
            return
        case 13:
            embeddedSessionVC?.destroyAndDismiss()
            setSessionBarMode(false, selectTab: "sessions")
            return
        case 14:
            minimizeEmbeddedSession()
            setSessionBarMode(false, selectTab: "home")
            let script = "window.dispatchEvent(new CustomEvent('larykoNativeTabSelected', { detail: { tab: 'home' } }))"
            bridgeVC.webView?.evaluateJavaScript(script, completionHandler: nil)
            return
        default:
            break
        }

        let tab: String
        switch item.tag {
        case 1: tab = "calculator"
        case 2: tab = "sessions"
        case 3: tab = "reminders"
        default: tab = "home"
        }
        if tab != "sessions" {
            embeddedSessionVC?.view.isHidden = true
        } else if let active = embeddedSessionVC {
            active.view.isHidden = false
            setSessionBarMode(true)
            view.bringSubviewToFront(active.view)
            view.bringSubviewToFront(nativeTabBar)
        }
        let script = "window.dispatchEvent(new CustomEvent('larykoNativeTabSelected', { detail: { tab: '\(tab)' } }))"
        bridgeVC.webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    func minimizeEmbeddedSession() {
        embeddedSessionVC?.view.isHidden = true
        setSessionBarMode(false, selectTab: "sessions")
    }

    func showEmbeddedSession(_ vc: SessionWebViewController) {
        if let current = embeddedSessionVC, current !== vc {
            current.view.isHidden = true
        }
        if vc.parent !== self {
            addChild(vc)
            vc.view.translatesAutoresizingMaskIntoConstraints = false
            view.insertSubview(vc.view, belowSubview: nativeTabBar)
            NSLayoutConstraint.activate([
                vc.view.topAnchor.constraint(equalTo: view.topAnchor),
                vc.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                vc.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                vc.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            ])
            vc.didMove(toParent: self)
        }
        vc.view.isHidden = false
        embeddedSessionVC = vc
        setSessionBarMode(true)
        view.bringSubviewToFront(vc.view)
        view.bringSubviewToFront(nativeTabBar)
    }

    func hideEmbeddedSession(_ uuid: String) {
        if let current = embeddedSessionVC {
            current.willMove(toParent: nil)
            current.view.removeFromSuperview()
            current.removeFromParent()
            embeddedSessionVC = nil
        }
        setSessionBarMode(false, selectTab: "sessions")
    }

    func updateNativeTab(tab: String) {
        if tab == "home" {
            nativeTabBar.selectedItem = homeTabItem
        } else if tab == "calculator" {
            nativeTabBar.selectedItem = calcTabItem
        } else if tab == "sessions" {
            nativeTabBar.selectedItem = sessionsTabItem
        } else if tab == "reminders" {
            nativeTabBar.selectedItem = remindersTabItem
        }
    }

    func setNativeTabBarVisible(_ visible: Bool) {
        UIView.animate(withDuration: 0.25) {
            self.nativeTabBar.alpha = visible ? 1.0 : 0.0
            self.nativeTabBar.isHidden = !visible
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
        window?.rootViewController = LarykoRootViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
