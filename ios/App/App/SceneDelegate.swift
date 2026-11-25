import UIKit
import Capacitor
import AudioToolbox
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
            guard let self = self, let presenter = self.bridge?.viewController else {
                call.resolve(["success": false])
                return
            }

            if let existing = self.activeControllers[uuidStr], existing.presentingViewController != nil {
                call.resolve(["success": true])
                return
            }

            let vc = SessionWebViewController(sessionUuid: uuidStr, sessionTitle: title, initialUrl: url)
            vc.modalPresentationStyle = .fullScreen
            vc.onSleep = { [weak self] id in
                self?.activeControllers.removeValue(forKey: id)
            }
            self.activeControllers[uuidStr] = vc
            presenter.present(vc, animated: true) {
                call.resolve(["success": true])
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

class SessionWebViewController: UIViewController {
    private let sessionUuid: String
    private let sessionTitle: String
    private let initialUrl: URL
    private var sessionWebView: WKWebView?
    var onSleep: ((String) -> Void)?

    init(sessionUuid: String, sessionTitle: String, initialUrl: URL) {
        self.sessionUuid = sessionUuid
        self.sessionTitle = sessionTitle
        self.initialUrl = initialUrl
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) not supported")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let navBar = UINavigationBar()
        navBar.translatesAutoresizingMaskIntoConstraints = false
        let navItem = UINavigationItem(title: sessionTitle)
        navItem.leftBarButtonItem = UIBarButtonItem(title: "Dormir 💤", style: .done, target: self, action: #selector(handleSleep))
        navItem.rightBarButtonItems = [
            UIBarButtonItem(barButtonSystemItem: .refresh, target: self, action: #selector(handleReload)),
            UIBarButtonItem(image: UIImage(systemName: "chevron.left"), style: .plain, target: self, action: #selector(handleBack))
        ]
        navBar.setItems([navItem], animated: false)

        let config = WKWebViewConfiguration()
        if #available(iOS 17.0, *), let uuid = UUID(uuidString: sessionUuid) {
            config.websiteDataStore = WKWebsiteDataStore(forIdentifier: uuid)
        } else {
            config.websiteDataStore = .nonPersistent()
        }

        let wv = WKWebView(frame: .zero, configuration: config)
        wv.translatesAutoresizingMaskIntoConstraints = false
        wv.allowsBackForwardNavigationGestures = true
        self.sessionWebView = wv

        view.addSubview(navBar)
        view.addSubview(wv)

        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            wv.topAnchor.constraint(equalTo: navBar.bottomAnchor),
            wv.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            wv.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            wv.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        wv.load(URLRequest(url: initialUrl))
    }

    @objc private func handleBack() {
        if sessionWebView?.canGoBack == true {
            sessionWebView?.goBack()
        }
    }

    @objc private func handleReload() {
        sessionWebView?.reload()
    }

    @objc private func handleSleep() {
        destroyAndDismiss()
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
// MainViewController – Controlador raíz con Liquid Glass UITabBar Nativo
// ============================================================
class MainViewController: CAPBridgeViewController, UITabBarDelegate {
    private let nativeTabBar = UITabBar()
    private var homeTabItem: UITabBarItem!
    private var calcTabItem: UITabBarItem!
    private var sessionsTabItem: UITabBarItem!
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
        bridge?.registerPluginInstance(MultiSessionPlugin())
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

        sessionsTabItem = UITabBarItem(
            title: "Sesiones",
            image: UIImage(systemName: "square.stack.3d.up"),
            selectedImage: UIImage(systemName: "square.stack.3d.up.fill")
        )
        sessionsTabItem.tag = 2

        thanksTabItem = UITabBarItem(
            title: "Thanks",
            image: UIImage(systemName: "sparkles"),
            selectedImage: UIImage(systemName: "sparkles")
        )
        thanksTabItem.tag = 3

        nativeTabBar.items = [homeTabItem, calcTabItem, sessionsTabItem, thanksTabItem]
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
        case 2: tab = "sessions"
        case 3: tab = "thanks"
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
        } else if tab == "sessions" {
            nativeTabBar.selectedItem = sessionsTabItem
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
