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

        let navBar = UINavigationBar()
        navBar.translatesAutoresizingMaskIntoConstraints = false
        let navItem = UINavigationItem(title: sessionTitle)
        let sessionsBtn = UIBarButtonItem(
            image: UIImage(systemName: "square.stack.3d.up"),
            style: .plain,
            target: self,
            action: #selector(handleMinimize)
        )
        sessionsBtn.accessibilityLabel = "Cambiar de sesión"
        let sleepBtn = UIBarButtonItem(
            image: UIImage(systemName: "moon.zzz"),
            style: .plain,
            target: self,
            action: #selector(handleSleep)
        )
        sleepBtn.accessibilityLabel = "Dormir sesión"
        navItem.leftBarButtonItems = [sessionsBtn, sleepBtn]
        navItem.rightBarButtonItems = [
            UIBarButtonItem(barButtonSystemItem: .refresh, target: self, action: #selector(handleReload)),
            UIBarButtonItem(image: UIImage(systemName: "chevron.left"), style: .plain, target: self, action: #selector(handleBack))
        ]
        navBar.setItems([navItem], animated: false)

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

        view.addSubview(navBar)
        view.addSubview(wv)
        view.addSubview(spinner)

        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            wv.topAnchor.constraint(equalTo: navBar.bottomAnchor),
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

    @objc private func handleMinimize() {
        onMinimize?(sessionUuid)
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

        nativeTabBar.items = [homeTabItem, calcTabItem, sessionsTabItem, remindersTabItem]
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
        case 3: tab = "reminders"
        default: tab = "home"
        }
        if tab != "sessions" {
            embeddedSessionVC?.view.isHidden = true
        } else if let active = embeddedSessionVC {
            if nativeTabBar.selectedItem == sessionsTabItem && !active.view.isHidden {
                active.view.isHidden = true
            } else {
                active.view.isHidden = false
                view.bringSubviewToFront(active.view)
                view.bringSubviewToFront(nativeTabBar)
            }
        }
        let script = "window.dispatchEvent(new CustomEvent('larykoNativeTabSelected', { detail: { tab: '\(tab)' } }))"
        bridgeVC.webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    func minimizeEmbeddedSession() {
        embeddedSessionVC?.view.isHidden = true
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
                vc.view.bottomAnchor.constraint(equalTo: nativeTabBar.topAnchor),
            ])
            vc.didMove(toParent: self)
        }
        vc.view.isHidden = false
        embeddedSessionVC = vc
        nativeTabBar.selectedItem = sessionsTabItem
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
