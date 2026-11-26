package com.laryko;

import android.app.Dialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.webkit.ProfileStore;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "MultiSessionPlugin")
public class MultiSessionPlugin extends Plugin {

    private final Map<String, Dialog> activeDialogs = new HashMap<>();
    private final Map<String, WebView> activeWebViews = new HashMap<>();

    private static final String DESKTOP_CHROME_UA =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    private static final String DESKTOP_SPOOF_JS =
        "try{" +
        "Object.defineProperty(navigator,'platform',{get:function(){return 'MacIntel';}});" +
        "Object.defineProperty(navigator,'maxTouchPoints',{get:function(){return 0;}});" +
        "}catch(e){}";

    private static final String WHATSAPP_AUTO_CONTINUE_JS =
        "(function(){" +
        "var tries=0;" +
        "var t=setInterval(function(){" +
        "tries++;" +
        "var els=document.querySelectorAll('a,button');" +
        "for(var i=0;i<els.length;i++){" +
        "var txt=(els[i].textContent||'').toLowerCase();" +
        "if(txt.indexOf('continuar en whatsapp web')!==-1||txt.indexOf('continue to whatsapp web')!==-1){" +
        "els[i].click();clearInterval(t);return;" +
        "}" +
        "}" +
        "if(tries>20)clearInterval(t);" +
        "},300);" +
        "})();";

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getContext().getResources().getDisplayMetrics()
        ));
    }

    private boolean isDesktopOnlyHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase();
        return h.contains("whatsapp.com") || h.contains("discord.com") || h.contains("slack.com") || h.contains("notion.so");
    }

    private LinearLayout createPillGroup() {
        LinearLayout pill = new LinearLayout(getContext());
        pill.setOrientation(LinearLayout.HORIZONTAL);
        pill.setGravity(Gravity.CENTER_VERTICAL);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#161B26"));
        bg.setCornerRadius(dp(999));
        bg.setStroke(dp(1), Color.parseColor("#2A3242"));
        pill.setBackground(bg);
        pill.setPadding(dp(4), dp(4), dp(4), dp(4));
        return pill;
    }

    private TextView createHeaderAction(String label, int textColor, int bgColor, View.OnClickListener onClick) {
        TextView tv = new TextView(getContext());
        tv.setText(label);
        tv.setTextColor(textColor);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        tv.setTypeface(Typeface.DEFAULT_BOLD);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(dp(12), dp(7), dp(12), dp(7));
        tv.setSingleLine(true);

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(bgColor);
        bg.setCornerRadius(dp(999));
        tv.setBackground(bg);

        tv.setClickable(true);
        tv.setFocusable(true);
        tv.setOnClickListener(onClick);
        return tv;
    }

    @PluginMethod
    public void openSession(PluginCall call) {
        String uuid = call.getString("uuid");
        String title = call.getString("title", "Sesión");
        String url = call.getString("url");

        if (uuid == null || url == null) {
            JSObject res = new JSObject();
            res.put("success", false);
            call.resolve(res);
            return;
        }

        Uri parsed = Uri.parse(url);
        String scheme = parsed.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
            JSObject res = new JSObject();
            res.put("success", false);
            call.resolve(res);
            return;
        }

        getActivity().runOnUiThread(() -> {
            Dialog existing = activeDialogs.get(uuid);
            if (existing != null) {
                if (!existing.isShowing()) {
                    existing.show();
                }
                JSObject res = new JSObject();
                res.put("success", true);
                call.resolve(res);
                return;
            }

            Dialog dialog = new Dialog(getContext(), android.R.style.Theme_Black_NoTitleBar);
            Window window = dialog.getWindow();
            if (window != null) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                window.setStatusBarColor(Color.parseColor("#0A0A0F"));
                window.setNavigationBarColor(Color.parseColor("#0A0A0F"));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    View decor = window.getDecorView();
                    int flags = decor.getSystemUiVisibility();
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    decor.setSystemUiVisibility(flags);
                }
            }

            LinearLayout root = new LinearLayout(getContext());
            root.setOrientation(LinearLayout.VERTICAL);
            root.setBackgroundColor(Color.parseColor("#0A0A0F"));
            root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ));

            LinearLayout toolbar = new LinearLayout(getContext());
            toolbar.setOrientation(LinearLayout.HORIZONTAL);
            toolbar.setGravity(Gravity.CENTER_VERTICAL);
            toolbar.setBackgroundColor(Color.parseColor("#0A0A0F"));
            toolbar.setPadding(dp(12), dp(10), dp(12), dp(10));

            LinearLayout leftPill = createPillGroup();
            TextView sessionsBtn = createHeaderAction(
                "Sesiones",
                Color.parseColor("#E5E7EB"),
                Color.TRANSPARENT,
                v -> minimizeSessionInternal(uuid)
            );
            TextView sleepBtn = createHeaderAction(
                "Dormir",
                Color.parseColor("#FCA5A5"),
                Color.parseColor("#2A161B"),
                v -> closeSessionInternal(uuid)
            );
            leftPill.addView(sessionsBtn);
            leftPill.addView(sleepBtn);

            TextView titleView = new TextView(getContext());
            titleView.setText(title);
            titleView.setTextColor(Color.WHITE);
            titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
            titleView.setTypeface(Typeface.DEFAULT_BOLD);
            titleView.setGravity(Gravity.CENTER);
            titleView.setSingleLine(true);
            titleView.setEllipsize(TextUtils.TruncateAt.END);
            titleView.setPadding(dp(10), 0, dp(10), 0);
            LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f
            );
            titleView.setLayoutParams(titleParams);

            WebView webView = new WebView(getContext());
            webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
            ));

            if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
                WebViewCompat.setProfile(webView, "session_" + uuid);
            }

            boolean desktopOnly = isDesktopOnlyHost(parsed.getHost());

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setSupportMultipleWindows(false);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false);

            if (desktopOnly) {
                settings.setUserAgentString(DESKTOP_CHROME_UA);
                settings.setUseWideViewPort(true);
                settings.setLoadWithOverviewMode(true);
            } else {
                settings.setUseWideViewPort(true);
            }

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String s = request.getUrl().getScheme();
                    if (s == null) return true;
                    String lower = s.toLowerCase();
                    return !("https".equals(lower) || "http".equals(lower) || "about".equals(lower) || "blob".equals(lower) || "data".equals(lower));
                }

                @Override
                public void onPageStarted(WebView view, String pageUrl, android.graphics.Bitmap favicon) {
                    super.onPageStarted(view, pageUrl, favicon);
                    if (desktopOnly) {
                        view.evaluateJavascript(DESKTOP_SPOOF_JS, null);
                    }
                }

                @Override
                public void onPageFinished(WebView view, String pageUrl) {
                    super.onPageFinished(view, pageUrl);
                    if (desktopOnly) {
                        view.evaluateJavascript(DESKTOP_SPOOF_JS, null);
                        view.evaluateJavascript(WHATSAPP_AUTO_CONTINUE_JS, null);
                    }
                }
            });

            LinearLayout rightPill = createPillGroup();
            TextView backBtn = createHeaderAction(
                "‹",
                Color.parseColor("#E5E7EB"),
                Color.TRANSPARENT,
                v -> {
                    if (webView.canGoBack()) {
                        webView.goBack();
                    }
                }
            );
            backBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
            TextView reloadBtn = createHeaderAction(
                "↻",
                Color.parseColor("#E5E7EB"),
                Color.TRANSPARENT,
                v -> webView.reload()
            );
            reloadBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
            rightPill.addView(backBtn);
            rightPill.addView(reloadBtn);

            toolbar.addView(leftPill);
            toolbar.addView(titleView);
            toolbar.addView(rightPill);

            View divider = new View(getContext());
            divider.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(1)
            ));
            divider.setBackgroundColor(Color.parseColor("#1F2937"));

            root.addView(toolbar);
            root.addView(divider);
            root.addView(webView);

            dialog.setContentView(root);
            dialog.setOnKeyListener((d, keyCode, event) -> {
                if (keyCode == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        minimizeSessionInternal(uuid);
                    }
                    return true;
                }
                return false;
            });

            activeDialogs.put(uuid, dialog);
            activeWebViews.put(uuid, webView);

            webView.loadUrl(url);
            dialog.show();

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    private void minimizeSessionInternal(String uuid) {
        Dialog d = activeDialogs.get(uuid);
        if (d != null && d.isShowing()) {
            d.hide();
        }
    }

    private void closeSessionInternal(String uuid) {
        WebView wv = activeWebViews.remove(uuid);
        if (wv != null) {
            wv.stopLoading();
            wv.destroy();
        }
        Dialog d = activeDialogs.remove(uuid);
        if (d != null && d.isShowing()) {
            d.dismiss();
        }
    }

    @PluginMethod
    public void sleepSession(PluginCall call) {
        String uuid = call.getString("uuid", "");
        getActivity().runOnUiThread(() -> {
            closeSessionInternal(uuid);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void sleepAllSessions(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            for (String uuid : activeDialogs.keySet().toArray(new String[0])) {
                closeSessionInternal(uuid);
            }
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void deleteSessionData(PluginCall call) {
        String uuid = call.getString("uuid", "");
        getActivity().runOnUiThread(() -> {
            closeSessionInternal(uuid);
            if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
                try {
                    ProfileStore.getInstance().deleteProfile("session_" + uuid);
                } catch (Exception ignored) {
                }
            }
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void getActiveSessions(PluginCall call) {
        JSArray arr = new JSArray();
        for (String uuid : activeDialogs.keySet()) {
            arr.put(uuid);
        }
        JSObject res = new JSObject();
        res.put("uuids", arr);
        call.resolve(res);
    }
}
