import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var blurView: UIVisualEffectView?

    private func addBlurOverlay() {
        if blurView != nil { return }

        let blurEffect = UIBlurEffect(style: .systemUltraThinMaterialDark)
        let blurEffectView = UIVisualEffectView(effect: blurEffect)
        blurEffectView.frame = window?.bounds ?? UIScreen.main.bounds
        blurEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        // Optional: add a simple label on top
        let label = UILabel()
        label.text = "Mint"
        label.textColor = .white
        label.font = UIFont.systemFont(ofSize: 24, weight: .semibold)
        label.translatesAutoresizingMaskIntoConstraints = false

        blurEffectView.contentView.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: blurEffectView.contentView.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: blurEffectView.contentView.centerYAnchor)
        ])

        window?.addSubview(blurEffectView)
        blurView = blurEffectView
    }

    private func removeBlurOverlay() {
        blurView?.removeFromSuperview()
        blurView = nil
    }

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // This is when iOS snapshots the app for the app switcher
        addBlurOverlay()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Keep blur in background as well
        addBlurOverlay()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // We remove blur on active, not here, to avoid flashing sensitive UI
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        removeBlurOverlay()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // nothing needed
    }

    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
