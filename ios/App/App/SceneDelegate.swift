import UIKit
import Capacitor
import AudioToolbox

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
        CAPPluginMethod(name: "setBadge", returnType: CAPPluginReturnPromise)
    ]

    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let selectionFeedback = UISelectionFeedbackGenerator()
    private let notificationFeedback = UINotificationFeedbackGenerator()

    override public func load() {
        super.load()
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
            "bridgeVersion": "1.1.0"
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
}

// ============================================================
// MainViewController – Controlador raíz Capacitor con registro de plugin
// ============================================================
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeIOSBridge())
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
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
