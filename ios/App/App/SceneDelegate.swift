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
        CAPPluginMethod(name: "setBadge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setActiveTab", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTabBarVisible", returnType: CAPPluginReturnPromise)
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
               let mainVC = window.rootViewController as? MainViewController {
                mainVC.updateNativeTab(tab: tab)
            }
            call.resolve(["success": true])
        }
    }

    @objc func setTabBarVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? true
        DispatchQueue.main.async {
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let window = windowScene.windows.first(where: { $0.isKeyWindow }),
               let mainVC = window.rootViewController as? MainViewController {
                mainVC.setNativeTabBarVisible(visible)
            }
            call.resolve(["success": true])
        }
    }
}

// ============================================================
// MainViewController – Controlador raíz con Liquid Glass UITabBar Nativo
// ============================================================
class MainViewController: CAPBridgeViewController, UITabBarDelegate {
    private let nativeTabBar = UITabBar()
    private var homeTabItem: UITabBarItem!
    private var calcTabItem: UITabBarItem!
    private var thanksTabItem: UITabBarItem!

    override open func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
        setupNativeTabBar()
        setNativeTabBarVisible(false)
    }

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeIOSBridge())
        webView?.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
        webView?.scrollView.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }

    private func setupNativeTabBar() {
        nativeTabBar.delegate = self
        nativeTabBar.translatesAutoresizingMaskIntoConstraints = false

        // Configuración de apariencia nativa Liquid Glass (.systemUltraThinMaterial)
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterial)
        
        nativeTabBar.standardAppearance = appearance
        if #available(iOS 15.0, *) {
            nativeTabBar.scrollEdgeAppearance = appearance
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

        thanksTabItem = UITabBarItem(
            title: "Thanks",
            image: UIImage(systemName: "sparkles"),
            selectedImage: UIImage(systemName: "sparkles")
        )
        thanksTabItem.tag = 2

        nativeTabBar.items = [homeTabItem, calcTabItem, thanksTabItem]
        nativeTabBar.selectedItem = homeTabItem

        view.addSubview(nativeTabBar)

        NSLayoutConstraint.activate([
            nativeTabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            nativeTabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            nativeTabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        let tab: String
        switch item.tag {
        case 1: tab = "calculator"
        case 2: tab = "thanks"
        default: tab = "home"
        }
        let script = "window.dispatchEvent(new CustomEvent('larykoNativeTabSelected', { detail: { tab: '\(tab)' } }))"
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    func updateNativeTab(tab: String) {
        if tab == "home" {
            nativeTabBar.selectedItem = homeTabItem
        } else if tab == "calculator" {
            nativeTabBar.selectedItem = calcTabItem
        } else if tab == "thanks" {
            nativeTabBar.selectedItem = thanksTabItem
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
