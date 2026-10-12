import UIKit
import WebKit
import Capacitor

/// Capacitor's WKWebView must not steal the leading-edge swipe for history back.
/// The dashboard uses that gesture to open the navigation drawer.
class DrinkatBridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        disableHistorySwipe()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        disableHistorySwipe()
    }

    private func disableHistorySwipe() {
        webView?.allowsBackForwardNavigationGestures = false
    }
}
